import "server-only";

import { Prisma, type CollectionStatus, type SaleStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { dateToYmdUtc } from "@/lib/sales/format";


export function parseCollectionDateInput(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(ymd);
  }
  return new Date(`${ymd}T12:00:00.000Z`);
}

/** Fechas de factura de las ventas imputadas (derivado de `collection_allocations` → `sales`). */
export function invoiceDateBoundsFromAllocations(
  allocations: { sale: { invoiceDate: Date } | null }[],
): { earliest: Date | null; latest: Date | null } {
  let earliest: Date | null = null;
  let latest: Date | null = null;
  for (const a of allocations) {
    const d = a.sale?.invoiceDate;
    if (!d) continue;
    if (!earliest || d.getTime() < earliest.getTime()) earliest = d;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  return { earliest, latest: latest ?? earliest };
}

export type ListCollectionsOptions = {
  q?: string;
  status?: CollectionStatus;
  currencyCode?: "ARS" | "USD";
  dateFrom?: string;
  dateTo?: string;
  visibilidad: "activas" | "archivadas" | "todas";
  page: number;
  pageSize: number;
};

export async function listCollections(organizationId: string, o: ListCollectionsOptions) {
  const where: Prisma.CollectionWhereInput = { organizationId };
  if (o.visibilidad === "activas") where.deletedAt = null;
  if (o.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (o.status) where.status = o.status;
  if (o.currencyCode) where.currencyCode = o.currencyCode;
  if (o.dateFrom || o.dateTo) {
    const dr: Prisma.DateTimeFilter = {};
    if (o.dateFrom) dr.gte = parseCollectionDateInput(o.dateFrom);
    if (o.dateTo) {
      const end = parseCollectionDateInput(o.dateTo);
      end.setUTCDate(end.getUTCDate() + 1);
      dr.lt = end;
    }
    where.collectionDate = dr;
  }
  const t = o.q?.trim();
  if (t) {
    where.OR = [
      { paymentMethodCode: { contains: t, mode: "insensitive" } },
      { notes: { contains: t, mode: "insensitive" } },
      { checkNumber: { contains: t, mode: "insensitive" } },
      { checkBankLabel: { contains: t, mode: "insensitive" } },
    ];
  }
  const { page, pageSize } = o;
  const [rawRows, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      orderBy: { collectionDate: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        grossAmount: true,
        currencyCode: true,
        collectionDate: true,
        status: true,
        voidedAt: true,
        paymentMethodCode: true,
        fxRateArsPerUnitUsdAtCollection: true,
        amountArsEquivalent: true,
        checkNumber: true,
        checkBankLabel: true,
        deletedAt: true,
        _count: { select: { allocations: true } },
        allocations: {
          where: { deletedAt: null },
          select: { sale: { select: { invoiceDate: true } } },
        },
      },
    }),
    prisma.collection.count({ where }),
  ]);
  const items = rawRows.map(({ allocations, ...rest }) => {
    const { earliest, latest } = invoiceDateBoundsFromAllocations(allocations);
    return {
      ...rest,
      earliestInvoiceDate: earliest,
      latestInvoiceDate: latest,
    };
  });
  return { items, total, page, pageSize };
}

export async function getCollectionById(organizationId: string, id: string) {
  return prisma.collection.findFirst({
    where: { id, organizationId },
    include: {
      fees: { where: { deletedAt: null } },
      allocations: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          sale: {
            select: {
              id: true,
              invoiceDate: true,
              invoiceNumber: true,
              totalAmount: true,
              currencyCode: true,
              status: true,
              client: { select: { displayName: true, legalName: true } },
            },
          },
        },
      },
    },
  });
}

export type ImputableSaleRow = {
  id: string;
  invoiceNumber: string | null;
  displayLabel: string;
  totalAmount: string;
  collectedInSaleCurrency: string;
  pendingInSaleCurrency: string;
  currencyCode: "ARS" | "USD";
  status: SaleStatus;
};

export async function listImputableSales(organizationId: string): Promise<ImputableSaleRow[]> {
  const sales = await prisma.sale.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { notIn: ["draft", "cancelled", "collected"] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      currencyCode: true,
      status: true,
      client: { select: { displayName: true, legalName: true } },
    },
    orderBy: { invoiceDate: "desc" },
    take: 500,
  });
  if (sales.length === 0) return [];
  const saleIds = sales.map((s) => s.id);
  const sumRows = await prisma.collectionAllocation.groupBy({
    by: ["saleId"],
    where: {
      organizationId,
      deletedAt: null,
      saleId: { in: saleIds },
      collection: { status: "valid", deletedAt: null },
    },
    _sum: { amountInSaleCurrency: true },
  });
  const bySale = new Map(
    sumRows.map((r) => [r.saleId, r._sum.amountInSaleCurrency ?? new Prisma.Decimal(0)]),
  );
  return sales.map((s) => {
    const c = bySale.get(s.id) ?? new Prisma.Decimal(0);
    const pending = s.totalAmount.minus(c);
    const label = s.client
      ? `${s.client.displayName || s.client.legalName} — ${s.invoiceNumber?.trim() || s.id.slice(0, 8)}`
      : s.invoiceNumber?.trim() || s.id;
    return {
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      displayLabel: label,
      totalAmount: s.totalAmount.toString(),
      currencyCode: s.currencyCode,
      status: s.status,
      collectedInSaleCurrency: c.toString(),
      pendingInSaleCurrency: pending.toString(),
    };
  });
}

export { dateToYmdUtc };
