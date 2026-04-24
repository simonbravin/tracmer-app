import type { CurrencyCode, SaleStatus } from "@prisma/client";

import { labelSaleStatus } from "./status";

const moneyFmt = (currency: CurrencyCode) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

/**
 * Suma días a una fecha (solo calendario; vencimiento de factura).
 */
export function addCreditDays(invoiceDate: Date, creditDays: number): Date {
  const d = new Date(
    Date.UTC(
      invoiceDate.getUTCFullYear(),
      invoiceDate.getUTCMonth(),
      invoiceDate.getUTCDate(),
    ),
  );
  d.setUTCDate(d.getUTCDate() + creditDays);
  return d;
}

export function formatDueDate(invoiceDate: Date, creditDays: number): string {
  const d = addCreditDays(invoiceDate, creditDays);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(d);
}

export function isPastDue(
  invoiceDate: Date,
  creditDays: number,
  now: Date = new Date(),
): boolean {
  const endTodayUtc = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ),
  );
  return addCreditDays(invoiceDate, creditDays) < endTodayUtc;
}

export function formatMoney(
  value: { toString(): string } | null | undefined,
  currency: CurrencyCode,
) {
  if (value == null) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return "—";
  return moneyFmt(currency).format(n);
}

export function formatMoneyPlain(value: { toString(): string } | null | undefined) {
  if (value == null) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
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

export { labelSaleStatus };

/** YYYY-MM-DD en UTC, para `input type="date"` a partir de `Date` (@db.Date). */
export function dateToYmdUtc(d: Date): string {
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function todayYmdUtc() {
  return dateToYmdUtc(new Date());
}

export function shortDateArUtc(d: Date) {
  return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

/** Rango de fechas de factura imputadas (misma fecha → una sola). */
export function shortInvoiceDateRangeArUtc(min: Date | null, max: Date | null): string {
  if (!min) return "—";
  if (!max || min.getTime() === max.getTime()) return shortDateArUtc(min);
  const a = shortDateArUtc(min);
  const b = shortDateArUtc(max);
  return a === b ? a : `${a} – ${b}`;
}

export function formatFxArsPerUsd(value: { toString(): string } | null | undefined): string {
  if (value == null) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(n);
}

export function describeOperationalStatus(
  status: SaleStatus,
  hasAllocations: boolean,
): string {
  if (status === "collected" || status === "partially_collected") {
    if (!hasAllocations) {
      return `${labelSaleStatus(status)} (sin cobros vinculados: pendiente módulo Cobranzas).`;
    }
  }
  return labelSaleStatus(status);
}
