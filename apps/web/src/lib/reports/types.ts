export const reportKeys = [
  "ventas",
  "cobranzas",
  "depositos",
  "transacciones_tesoreria",
  "conciliaciones",
  "clientes",
] as const;
export type ReportKey = (typeof reportKeys)[number];

export const reportLabels: Record<ReportKey, string> = {
  ventas: "Ventas",
  cobranzas: "Cobranzas",
  depositos: "Depósitos bancarios",
  transacciones_tesoreria: "Transacciones de tesorería",
  conciliaciones: "Conciliaciones",
  clientes: "Clientes y contactos",
};

export const reportDescriptions: Record<ReportKey, string> = {
  ventas: "Facturación con filtros por fecha, cliente, estado y moneda.",
  cobranzas: "Cobranzas con bruto, neto (gastos) e imputaciones a facturas.",
  depositos: "Movimientos a cuenta con cuenta bancaria, fecha y monto.",
  transacciones_tesoreria:
    "Feed unificado (efectivo u operativo): depósitos, transferencias, manuales, cobranzas y gastos de cobranza.",
  conciliaciones: "Líneas y discrepancias por conciliación.",
  clientes: "Clientes y sus contactos.",
};
