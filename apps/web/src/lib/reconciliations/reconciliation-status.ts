import type { ReconciliationStatus } from "@prisma/client";

export function labelReconciliationStatus(s: ReconciliationStatus): string {
  if (s === "draft") return "Borrador";
  if (s === "closed") return "Cerrada";
  if (s === "voided") return "Anulada";
  return s;
}
