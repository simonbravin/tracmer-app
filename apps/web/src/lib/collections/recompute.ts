import "server-only";

import { Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { isPastDue } from "@/lib/sales/format";

const MONEY_TOL = new Prisma.Decimal("0.01");

export async function sumAllocatedToSale(organizationId: string, saleId: string) {
  const r = await prisma.collectionAllocation.aggregate({
    where: {
      organizationId,
      saleId,
      deletedAt: null,
      collection: { deletedAt: null, status: "valid" },
    },
    _sum: { amountInSaleCurrency: true },
  });
  return r._sum.amountInSaleCurrency ?? new Prisma.Decimal(0);
}

/**
 * Reglas BR §1.1 / vencida: vence si no cobrada y pasó vencimiento.
 * Tolerancia de redondeo 0,01 (BR §12, valor global fijo mínimo hasta catálogo).
 */
export async function recomputeAndPersistSaleStatus(organizationId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId, deletedAt: null },
  });
  if (!sale) return;
  if (sale.status === SaleStatus.cancelled || sale.status === SaleStatus.draft) {
    return;
  }

  const total = sale.totalAmount;
  const collected = await sumAllocatedToSale(organizationId, saleId);
  const diffAbs = collected.minus(total).abs();
  let next: SaleStatus;

  if (diffAbs.lte(MONEY_TOL)) {
    next = SaleStatus.collected;
  } else if (isPastDue(sale.invoiceDate, sale.creditDays)) {
    next = SaleStatus.overdue;
  } else if (collected.gt(MONEY_TOL)) {
    next = SaleStatus.partially_collected;
  } else {
    next = SaleStatus.issued;
  }

  if (next !== sale.status) {
    await prisma.sale.update({
      where: { id: saleId },
      data: { status: next },
    });
  }
}

export async function recomputeManySales(organizationId: string, saleIds: string[]) {
  const u = [...new Set(saleIds.filter(Boolean))];
  for (const id of u) {
    await recomputeAndPersistSaleStatus(organizationId, id);
  }
}
