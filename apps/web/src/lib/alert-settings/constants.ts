import {
  ALERT_TYPE_COLLECTION_NOT_DEPOSITED,
  ALERT_TYPE_INCONSISTENCY,
  ALERT_TYPE_INVOICE_OVERDUE,
} from "@/lib/alerts/constants";

export const CONFIGURABLE_EMAIL_ALERT_TYPES = [
  {
    type: ALERT_TYPE_INVOICE_OVERDUE,
    label: "Facturas vencidas con saldo",
    description: "Ventas con vencimiento superado y cobro incompleto.",
  },
  {
    type: ALERT_TYPE_COLLECTION_NOT_DEPOSITED,
    label: "Cobranza sin conciliar a depósito",
    description:
      "Cobranza con saldo pendiente de imputar a un depósito bancario (días mínimos definidos en el producto).",
  },
  {
    type: ALERT_TYPE_INCONSISTENCY,
    label: "Inconsistencias y discrepancias",
    description: "Cobranzas o líneas de conciliación con datos inconsistentes.",
  },
] as const;

export const ALL_EMAIL_TYPE_CODES = CONFIGURABLE_EMAIL_ALERT_TYPES.map((x) => x.type);
