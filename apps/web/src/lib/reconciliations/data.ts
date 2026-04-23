import "server-only";

import { Prisma, ReconciliationStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";
import {
  mapReconciledByCollection,
  mapReconciledByDeposit,
  pendingCollection,
  pendingDeposit,
} from "./balances";

export type ListReconciliationsOptions = {
  q?: string;
  status?: ReconciliationStatus;
  visibilidad: "activas" | "archivadas" | "todas";
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export function parseYmd(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(ymd);
  }
  return new Date(`${ymd}T12:00:00.000Z`);
}

export async function listReconciliations(organizationId: string, o: ListReconciliationsOptions) {
  const where: Prisma.ReconciliationWhereInput = { organizationId };
  if (o.visibilidad === "activas") where.deletedAt = null;
  if (o.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (o.status) where.status = o.status;
  if (o.dateFrom || o.dateTo) {
    const f: Prisma.DateTimeFilter = {};
    if (o.dateFrom) f.gte = parseYmd(o.dateFrom);
    if (o.dateTo) {
      const e = parseYmd(o.dateTo);
      e.setUTCDate(e.getUTCDate() + 1);
      f.lt = e;
    }
    where.createdAt = f;
  }
  const t = o.q?.trim();
  if (t) {
    where.OR = [{ notes: { contains: t, mode: "insensitive" } }, { id: { contains: t, mode: "insensitive" } }];
  }
  const { page, pageSize } = o;
  const [items, total] = await Promise.all([
    prisma.reconciliation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        deletedAt: true,
        _count: { select: { lines: true, discrepancies: true } },
      },
    }),
    prisma.reconciliation.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getReconciliationById(organizationId: string, id: string) {
  return prisma.reconciliation.findFirst({
    where: { id, organizationId },
    include: {
      lines: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          collection: {
            select: {
              id: true,
              grossAmount: true,
              currencyCode: true,
              collectionDate: true,
              status: true,
              voidedAt: true,
            },
          },
          bankDeposit: {
            select: {
              id: true,
              amount: true,
              currencyCode: true,
              depositDate: true,
              bankAccount: { select: { name: true, bankName: true } },
            },
          },
        },
      },
      discrepancies: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Cobranzas con saldo conciliable (sinvoid, activas) y “pendiente” estricta > 0. */
export async function listAvailableCollections(organizationId: string) {
  const [reconciledMap, draftMap] = await Promise.all([
    mapReconciledByCollection(organizationId),
    mapDraftByCollection(organizationId),
  ]);
  const cols = await prisma.collection.findMany({
    where: {
      organizationId,
      deletedAt: null,
      voidedAt: null,
      status: "valid",
    },
    select: {
      id: true,
      grossAmount: true,
      currencyCode: true,
      collectionDate: true,
      paymentMethodCode: true,
    },
    orderBy: { collectionDate: "desc" },
  });
  const out: ((typeof cols)[0] & { pending: Prisma.Decimal })[] = [];
  for (const c of cols) {
    const rec = reconciledMap.get(c.id) ?? new Prisma.Decimal(0);
    const dr = draftMap.get(c.id) ?? new Prisma.Decimal(0);
    const pend = pendingCollection(c.grossAmount, rec).sub(dr);
    if (pend.gt(0)) {
      out.push({ ...c, pending: pend });
    }
  }
  return out;
}

/** Depósitos con saldo > 0 respecto a closed + draft de terceros. */
export async function listAvailableDeposits(organizationId: string) {
  const [reconciledMap, draftMap] = await Promise.all([
    mapReconciledByDeposit(organizationId),
    mapDraftByDeposit(organizationId),
  ]);
  const deps = await prisma.bankDeposit.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      amount: true,
      currencyCode: true,
      depositDate: true,
      reference: true,
      bankAccount: { select: { name: true, bankName: true } },
    },
    orderBy: { depositDate: "desc" },
  });
  const out: ((typeof deps)[0] & { pending: Prisma.Decimal })[] = [];
  for (const d of deps) {
    const rec = reconciledMap.get(d.id) ?? new Prisma.Decimal(0);
    const dr = draftMap.get(d.id) ?? new Prisma.Decimal(0);
    const pend = pendingDeposit(d.amount, rec).sub(dr);
    if (pend.gt(0)) {
      out.push({ ...d, pending: pend });
    }
  }
  return out;
}

export async function mapDraftByCollection(organizationId: string) {
  const rows = await prisma.reconciliationLine.groupBy({
    by: ["collectionId"],
    where: {
      organizationId,
      deletedAt: null,
      reconciliation: { organizationId, deletedAt: null, status: ReconciliationStatus.draft },
    },
    _sum: { amountAppliedFromCollection: true },
  });
  const m = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    m.set(
      r.collectionId,
      r._sum.amountAppliedFromCollection ?? new Prisma.Decimal(0),
    );
  }
  return m;
}

export async function mapDraftByDeposit(organizationId: string) {
  const rows = await prisma.reconciliationLine.groupBy({
    by: ["bankDepositId"],
    where: {
      organizationId,
      deletedAt: null,
      reconciliation: { organizationId, deletedAt: null, status: ReconciliationStatus.draft },
    },
    _sum: { amountAppliedToDeposit: true },
  });
  const m = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    m.set(r.bankDepositId, r._sum.amountAppliedToDeposit ?? new Prisma.Decimal(0));
  }
  return m;
}

export type ColAvail = Awaited<ReturnType<typeof listAvailableCollections>>[0];
export type DepAvail = Awaited<ReturnType<typeof listAvailableDeposits>>[0];

/**
 * Incluye cobranzas/depósitos vinculados a líneas aunque el listado "disponible" ya no los tenga.
 */
export async function listCollectionsAndDepositsForReconForm(
  organizationId: string,
  colIds: string[],
  depIds: string[],
): Promise<{ collections: ColAvail[]; deposits: DepAvail[] }> {
  const [avC, avD, extraC, extraD, recC, recD, draftC, draftD] = await Promise.all([
    listAvailableCollections(organizationId),
    listAvailableDeposits(organizationId),
    colIds.length
      ? prisma.collection.findMany({
          where: { id: { in: [...new Set(colIds)] }, organizationId, deletedAt: null },
          select: { id: true, grossAmount: true, currencyCode: true, collectionDate: true, paymentMethodCode: true },
        })
      : Promise.resolve([]),
    depIds.length
      ? prisma.bankDeposit.findMany({
          where: { id: { in: [...new Set(depIds)] }, organizationId, deletedAt: null },
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            depositDate: true,
            reference: true,
            bankAccount: { select: { name: true, bankName: true } },
          },
        })
      : Promise.resolve([]),
    mapReconciledByCollection(organizationId),
    mapReconciledByDeposit(organizationId),
    mapDraftByCollection(organizationId),
    mapDraftByDeposit(organizationId),
  ]);
  const mC = new Map<string, ColAvail>();
  for (const x of avC) mC.set(x.id, x);
  for (const c of extraC) {
    if (!mC.has(c.id)) {
      const r = recC.get(c.id) ?? new Prisma.Decimal(0);
      const dr = draftC.get(c.id) ?? new Prisma.Decimal(0);
      mC.set(c.id, { ...c, pending: pendingCollection(c.grossAmount, r).sub(dr) } as ColAvail);
    }
  }
  const mD = new Map<string, DepAvail>();
  for (const x of avD) mD.set(x.id, x);
  for (const d of extraD) {
    if (!mD.has(d.id)) {
      const r = recD.get(d.id) ?? new Prisma.Decimal(0);
      const dr = draftD.get(d.id) ?? new Prisma.Decimal(0);
      mD.set(d.id, { ...d, pending: pendingDeposit(d.amount, r).sub(dr) } as DepAvail);
    }
  }
  return { collections: [...mC.values()], deposits: [...mD.values()] };
}