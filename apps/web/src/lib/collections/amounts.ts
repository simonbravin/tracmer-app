import { Prisma } from "@prisma/client";

import { TOLERANCE } from "./constants";

export function toDecimalString(s: string) {
  const t = s.trim().replace(/\s/g, "");
  const n = t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t;
  return n;
}

/** Gasto en moneda de cobranza: importe del gasto × tasa a moneda cobranza. */
export function feeAmountInCollectionCurrency(
  feeAmount: Prisma.Decimal,
  fxRateToCollection: Prisma.Decimal,
): Prisma.Decimal {
  return feeAmount.mul(fxRateToCollection);
}

/**
 * Suma de imputaciones (moneda cobranza) ≤ bruto (tolerancia).
 * Retorna { ok, sumAlloc, overflow }.
 */
export function checkAllocationsVsGross(
  gross: Prisma.Decimal,
  sumAllocInCol: Prisma.Decimal,
): { ok: boolean; overflow: Prisma.Decimal } {
  const o = sumAllocInCol.minus(gross);
  if (o.gt(TOLERANCE)) {
    return { ok: false, overflow: o };
  }
  return { ok: true, overflow: new Prisma.Decimal(0) };
}

/**
 * Neto = bruto − suma de gastos expresada en moneda de cobranza.
 */
export function collectionNetInCollectionCurrency(
  gross: Prisma.Decimal,
  sumFeesInCol: Prisma.Decimal,
): Prisma.Decimal {
  return gross.minus(sumFeesInCol);
}
