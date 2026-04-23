import "server-only";

import type { SaleStatus } from "@prisma/client";

import { prisma } from "@tracmer-app/database";
import type { Prisma } from "@prisma/client";

export function parseInvoiceDateInput(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(ymd);
  }
  return new Date(`${ymd}T12:00:00.000Z`);
}

export async function listActiveClients(organizationId: string) {
  return prisma.client.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, displayName: true, legalName: true },
    orderBy: { displayName: "asc" },
  });
}

export type ListSalesOptions = {
  q?: string;
  clientId?: string;
  status?: SaleStatus;
  dateFrom?: string;
  dateTo?: string;
  visibilidad: "activas" | "archivadas" | "todas";
  page: number;
  pageSize: number;
};

export async function listSales(organizationId: string, o: ListSalesOptions) {
  const where: Prisma.SaleWhereInput = { organizationId };
  if (o.visibilidad === "activas") where.deletedAt = null;
  if (o.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (o.clientId) where.clientId = o.clientId;
  if (o.status) where.status = o.status;
  if (o.dateFrom || o.dateTo) {
    const inv: Prisma.DateTimeFilter = {};
    if (o.dateFrom) inv.gte = parseInvoiceDateInput(o.dateFrom);
    if (o.dateTo) {
      const end = parseInvoiceDateInput(o.dateTo);
      end.setUTCDate(end.getUTCDate() + 1);
      inv.lt = end;
    }
    where.invoiceDate = inv;
  }
  const t = o.q?.trim();
  if (t) {
    where.OR = [
      { invoiceNumber: { contains: t, mode: "insensitive" } },
      {
        client: {
          OR: [
            { displayName: { contains: t, mode: "insensitive" } },
            { legalName: { contains: t, mode: "insensitive" } },
          ],
        },
      },
    ];
  }
  const { page, pageSize } = o;
  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        status: true,
        invoiceDate: true,
        creditDays: true,
        totalAmount: true,
        currencyCode: true,
        amountArsEquivalentAtIssue: true,
        invoiceNumber: true,
        deletedAt: true,
        client: { select: { id: true, displayName: true, legalName: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getSaleById(organizationId: string, id: string) {
  const s = await prisma.sale.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, displayName: true, legalName: true, taxId: true } },
    },
  });
  if (!s) return null;
  const allocationCount = await prisma.collectionAllocation.count({
    where: { organizationId, saleId: s.id, deletedAt: null },
  });
  return { ...s, allocationCount };
}
