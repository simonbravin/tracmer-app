/**
 * Categorías mínimas para `reconciliation_discrepancies.category_code` (string estable).
 * Catálogo formal en producto/BR: pendiente — versión provisoria.
 */
export const DISCREPANCY_CATEGORIES = [
  { code: "commission", label: "Comisión" },
  { code: "rounding", label: "Redondeo" },
  { code: "fx_deviation", label: "Diferencia de tipo de cambio" },
  { code: "unidentified_income", label: "Ingreso no identificado" },
  { code: "other", label: "Otro" },
] as const;

export function labelDiscrepancyCategory(code: string): string {
  const c = DISCREPANCY_CATEGORIES.find((x) => x.code === code);
  return c?.label ?? code;
}
