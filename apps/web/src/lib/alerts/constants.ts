/**
 * Días mínimos desde `collection_date` con saldo pendiente de conciliación
 * para disparar alerta de cobranza no depositada.
 * (Umbral de producto pendiente en BR §11 / §16 — valor mínimo seguro.)
 */
export const STALE_PENDING_COLLECTION_DAYS = 7;

export const ALERT_TYPE_INVOICE_OVERDUE = "invoice_overdue";
export const ALERT_TYPE_COLLECTION_NOT_DEPOSITED = "collection_not_deposited";
export const ALERT_TYPE_INCONSISTENCY = "inconsistency";

export const ALERT_SEVERITY_LOW = "low";
export const ALERT_SEVERITY_MEDIUM = "medium";
export const ALERT_SEVERITY_HIGH = "high";
export const ALERT_SEVERITY_CRITICAL = "critical";

export const ENTITY_SALE = "Sale";
export const ENTITY_COLLECTION = "Collection";
export const ENTITY_RECONCILIATION_DISCREPANCY = "ReconciliationDiscrepancy";

export function labelAlertType(type: string): string {
  switch (type) {
    case ALERT_TYPE_INVOICE_OVERDUE:
      return "Factura vencida";
    case ALERT_TYPE_COLLECTION_NOT_DEPOSITED:
      return "Cobranza pend. de conciliar a depósito";
    case ALERT_TYPE_INCONSISTENCY:
      return "Inconsistencia";
    default:
      return type;
  }
}

export function labelSeverity(s: string): string {
  switch (s) {
    case "low":
      return "Baja";
    case "medium":
      return "Media";
    case "high":
      return "Alta";
    case "critical":
      return "Crítica";
    default:
      return s;
  }
}
