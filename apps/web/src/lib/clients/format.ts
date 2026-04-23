/** Muestra CUIT con guiones si son 11 dígitos. */
export function formatTaxId(taxId: string | null | undefined): string {
  if (taxId == null || taxId.length === 0) return "—";
  const d = taxId.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
  }
  return taxId;
}

export function dateTimeAr(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
