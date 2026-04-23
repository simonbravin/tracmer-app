import type { SaleStatus } from "@prisma/client";

const LABELS: Record<SaleStatus, string> = {
  draft: "Borrador",
  issued: "Emitida",
  partially_collected: "Parcialmente cobrada",
  collected: "Cobrada",
  overdue: "Vencida",
  cancelled: "Cancelada",
};

export function labelSaleStatus(s: SaleStatus): string {
  return LABELS[s] ?? s;
}

export const saleStatusesForList = [
  "draft",
  "issued",
  "partially_collected",
  "collected",
  "overdue",
  "cancelled",
] as const satisfies readonly SaleStatus[];
