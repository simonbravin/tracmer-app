/**
 * Convierte un string de fecha de factura / filtro (YYYY-MM-DD) a `Date` (mediodía UTC).
 * Módulo compartido (sin `server-only`) para validación usada también en el cliente.
 */
export function parseInvoiceDateInput(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(ymd);
  }
  return new Date(`${ymd}T12:00:00.000Z`);
}
