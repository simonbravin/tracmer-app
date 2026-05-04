import "server-only";

import type { CurrencyCode } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { parseBankDate } from "@/lib/banks/data";
import { feeAmountInCollectionCurrency } from "@/lib/collections/amounts";

import type { TransactionFeedQuery } from "./validation";
import { MAX_FEED_RANGE_DAYS } from "./validation";

export type TransactionFeedRow = {
  id: string;
  sortAt: string;
  documentDate: string;
  title: string;
  subtitle: string | null;
  origin: "deposito_bancario" | "transferencia" | "cobranza" | "gasto_cobranza" | "movimiento_manual";
  flow: "ingreso" | "egreso" | "interno";
  amount: string;
  currencyCode: CurrencyCode;
  treasuryLocationId: string | null;
  treasuryLocationLabel: string | null;
  href: string | null;
};

function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateRangeFromQuery(q: TransactionFeedQuery): { ok: true; gte: Date; lt: Date } | { ok: false; error: string } {
  const today = new Date();
  const ltDefault = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 12, 0, 0, 0),
  );
  const lt = q.hasta
    ? new Date(
        Date.UTC(
          parseBankDate(q.hasta).getUTCFullYear(),
          parseBankDate(q.hasta).getUTCMonth(),
          parseBankDate(q.hasta).getUTCDate() + 1,
          12,
          0,
          0,
          0,
        ),
      )
    : ltDefault;
  const gte = q.desde
    ? new Date(
        Date.UTC(
          parseBankDate(q.desde).getUTCFullYear(),
          parseBankDate(q.desde).getUTCMonth(),
          parseBankDate(q.desde).getUTCDate(),
          12,
          0,
          0,
          0,
        ),
      )
    : new Date(lt.getTime() - 90 * 86400000);
  const ms = lt.getTime() - gte.getTime();
  const days = ms / 86400 / 1000;
  if (days > MAX_FEED_RANGE_DAYS || days < 0) {
    return { ok: false, error: `El rango no puede superar ${MAX_FEED_RANGE_DAYS} días ni ser invertido.` };
  }
  return { ok: true, gte, lt };
}

export async function listTransactionFeed(
  organizationId: string,
  q: TransactionFeedQuery,
): Promise<
  | { ok: true; rows: TransactionFeedRow[]; total: number; page: number; pageSize: number; range: { desde: string; hasta: string } }
  | { ok: false; error: string }
> {
  const dr = dateRangeFromQuery(q);
  if (!dr.ok) {
    return dr;
  }
  const { gte, lt } = dr;
  const range = { desde: ymdUtc(gte), hasta: ymdUtc(new Date(lt.getTime() - 86400000)) };

  const bankRows = await prisma.bankAccount.findMany({
    where: { organizationId },
    select: { id: true, name: true, treasuryLocationId: true, treasuryLocation: { select: { displayName: true } } },
  });
  const bankIdByTreasuryId = new Map(bankRows.map((b) => [b.treasuryLocationId, b.id]));
  const treasuryLabel = new Map(bankRows.map((b) => [b.treasuryLocationId, b.treasuryLocation.displayName]));

  const locRows = await prisma.treasuryLocation.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, displayName: true },
  });
  for (const l of locRows) {
    if (!treasuryLabel.has(l.id)) {
      treasuryLabel.set(l.id, l.displayName);
    }
  }

  const ubic = q.ubicacion ?? null;
  const bankIdsForUbic =
    ubic == null
      ? null
      : (() => {
          const bid = bankIdByTreasuryId.get(ubic);
          return bid ? [bid] : [];
        })();
  /** Ubicación no bancaria: no hay depósitos ni transferencias bancarias para esa caja/MP. */
  const skipBankSourceQueries = ubic != null && bankIdsForUbic !== null && bankIdsForUbic.length === 0;

  const rows: TransactionFeedRow[] = [];

  const push = (r: Omit<TransactionFeedRow, "sortAt"> & { sortAt: Date }) => {
    if (q.moneda && r.currencyCode !== q.moneda) return;
    if (ubic && r.treasuryLocationId !== ubic) return;
    if (q.flujo !== "todos" && r.flow !== q.flujo) return;
    rows.push({
      ...r,
      sortAt: r.sortAt.toISOString(),
    });
  };

  if (q.vista === "efectivo") {
    const depWhere: Prisma.BankDepositWhereInput = {
      organizationId,
      deletedAt: null,
      depositDate: { gte, lt },
    };
    if (bankIdsForUbic) {
      depWhere.bankAccountId = { in: bankIdsForUbic };
    }
    const deposits = skipBankSourceQueries
      ? []
      : await prisma.bankDeposit.findMany({
          where: depWhere,
          select: {
            id: true,
            depositDate: true,
            amount: true,
            currencyCode: true,
            reference: true,
            bankAccount: { select: { treasuryLocationId: true, name: true } },
          },
          orderBy: { depositDate: "desc" },
          take: 2000,
        });
    for (const d of deposits) {
      const tl = d.bankAccount.treasuryLocationId;
      push({
        id: `dep-${d.id}`,
        sortAt: d.depositDate,
        documentDate: ymdUtc(d.depositDate),
        title: "Depósito bancario",
        subtitle: d.reference || d.bankAccount.name,
        origin: "deposito_bancario",
        flow: "ingreso",
        amount: d.amount.toString(),
        currencyCode: d.currencyCode,
        treasuryLocationId: tl,
        treasuryLocationLabel: treasuryLabel.get(tl) ?? null,
        href: `/bancos/depositos/${d.id}`,
      });
    }

    const xferWhere: Prisma.BankTransferWhereInput = {
      organizationId,
      deletedAt: null,
      transferDate: { gte, lt },
    };
    if (bankIdsForUbic) {
      const bid = bankIdsForUbic[0];
      xferWhere.OR = [{ fromBankAccountId: bid }, { toBankAccountId: bid }];
    }
    const xfers = skipBankSourceQueries
      ? []
      : await prisma.bankTransfer.findMany({
          where: xferWhere,
          select: {
            id: true,
            transferDate: true,
            amount: true,
            currencyCode: true,
            feeAmount: true,
            notes: true,
            fromAccount: { select: { id: true, name: true, treasuryLocationId: true } },
            toAccount: { select: { id: true, name: true, treasuryLocationId: true } },
          },
          orderBy: { transferDate: "desc" },
          take: 2000,
        });
    for (const t of xfers) {
      const fee = t.feeAmount ?? new Prisma.Decimal(0);
      const sub = t.amount.add(fee);
      push({
        id: `xf-out-${t.id}`,
        sortAt: t.transferDate,
        documentDate: ymdUtc(t.transferDate),
        title: "Transferencia (salida)",
        subtitle: `${t.fromAccount.name} → ${t.toAccount.name}${t.notes ? ` · ${t.notes}` : ""}`,
        origin: "transferencia",
        flow: "interno",
        amount: sub.toString(),
        currencyCode: t.currencyCode,
        treasuryLocationId: t.fromAccount.treasuryLocationId,
        treasuryLocationLabel: treasuryLabel.get(t.fromAccount.treasuryLocationId) ?? null,
        href: `/bancos/transferencias/${t.id}`,
      });
      push({
        id: `xf-in-${t.id}`,
        sortAt: t.transferDate,
        documentDate: ymdUtc(t.transferDate),
        title: "Transferencia (entrada)",
        subtitle: `${t.fromAccount.name} → ${t.toAccount.name}`,
        origin: "transferencia",
        flow: "interno",
        amount: t.amount.toString(),
        currencyCode: t.currencyCode,
        treasuryLocationId: t.toAccount.treasuryLocationId,
        treasuryLocationLabel: treasuryLabel.get(t.toAccount.treasuryLocationId) ?? null,
        href: `/bancos/transferencias/${t.id}`,
      });
    }

    const manuals = await prisma.treasuryManualMovement.findMany({
      where: {
        organizationId,
        deletedAt: null,
        movementDate: { gte, lt },
        ...(ubic ? { treasuryLocationId: ubic } : {}),
      },
      select: {
        id: true,
        movementDate: true,
        amount: true,
        currencyCode: true,
        direction: true,
        memo: true,
        treasuryLocationId: true,
      },
      orderBy: { movementDate: "desc" },
      take: 500,
    });
    for (const m of manuals) {
      push({
        id: `man-${m.id}`,
        sortAt: m.movementDate,
        documentDate: ymdUtc(m.movementDate),
        title: m.direction === "inflow" ? "Ingreso manual" : "Egreso manual",
        subtitle: m.memo,
        origin: "movimiento_manual",
        flow: m.direction === "inflow" ? "ingreso" : "egreso",
        amount: m.amount.toString(),
        currencyCode: m.currencyCode,
        treasuryLocationId: m.treasuryLocationId,
        treasuryLocationLabel: treasuryLabel.get(m.treasuryLocationId) ?? null,
        href: "/tesoreria/transacciones",
      });
    }
  } else {
    const cols = await prisma.collection.findMany({
      where: {
        organizationId,
        deletedAt: null,
        voidedAt: null,
        status: "valid",
        collectionDate: { gte, lt },
      },
      select: {
        id: true,
        collectionDate: true,
        grossAmount: true,
        currencyCode: true,
        paymentMethodCode: true,
        notes: true,
      },
      orderBy: { collectionDate: "desc" },
      take: 2000,
    });
    for (const c of cols) {
      push({
        id: `col-${c.id}`,
        sortAt: c.collectionDate,
        documentDate: ymdUtc(c.collectionDate),
        title: "Cobranza (bruto)",
        subtitle: c.paymentMethodCode || c.notes || null,
        origin: "cobranza",
        flow: "ingreso",
        amount: c.grossAmount.toString(),
        currencyCode: c.currencyCode,
        treasuryLocationId: null,
        treasuryLocationLabel: null,
        href: `/operaciones/cobranzas/${c.id}`,
      });
    }

    const fees = await prisma.collectionFee.findMany({
      where: {
        organizationId,
        deletedAt: null,
        collection: {
          organizationId,
          deletedAt: null,
          voidedAt: null,
          status: "valid",
          collectionDate: { gte, lt },
        },
      },
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        fxRateToCollectionCurrency: true,
        description: true,
        collection: { select: { id: true, collectionDate: true, currencyCode: true } },
      },
      orderBy: { id: "desc" },
      take: 2000,
    });
    for (const f of fees) {
      const colCcy = f.collection.currencyCode;
      const inCol = feeAmountInCollectionCurrency(
        f.amount,
        new Prisma.Decimal(f.fxRateToCollectionCurrency),
      );
      push({
        id: `fee-${f.id}`,
        sortAt: f.collection.collectionDate,
        documentDate: ymdUtc(f.collection.collectionDate),
        title: "Gasto de cobranza",
        subtitle: f.description,
        origin: "gasto_cobranza",
        flow: "egreso",
        amount: inCol.toString(),
        currencyCode: colCcy,
        treasuryLocationId: null,
        treasuryLocationLabel: null,
        href: `/operaciones/cobranzas/${f.collection.id}`,
      });
    }
  }

  rows.sort((a, b) => (a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0));
  const total = rows.length;
  const start = (q.page - 1) * q.pageSize;
  const slice = rows.slice(start, start + q.pageSize);
  return { ok: true, rows: slice, total, page: q.page, pageSize: q.pageSize, range };
}
