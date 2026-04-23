import { z } from "zod";
import { Prisma } from "@prisma/client";

import { formDataToObject } from "@/lib/clients/validation";
import { MAX_ALLOCATION_LINES, MAX_FEE_LINES } from "./constants";

const decimalLike = z
  .string()
  .min(1, "Ingresá un monto")
  .transform((s) => s.trim().replace(/\s/g, ""))
  .refine(
    (s) => {
      const t = s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s;
      return !Number.isNaN(Number(t)) && Number.isFinite(Number(t));
    },
    { message: "Monto no válido" },
  )
  .transform((s) => (s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s));

const optionalDecimal = z
  .string()
  .optional()
  .transform((v) => (v == null || v.trim() === "" ? undefined : v))
  .refine((v) => v == null || v === "" || !Number.isNaN(Number(String(v).replace(",", "."))), {
    message: "Número no válido",
  });

export const allocationInputLine = z.object({
  saleId: z.string().cuid("Elegí una venta"),
  amountInCollectionCurrency: decimalLike,
  fxRateToSaleCurrency: z
    .string()
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v)),
});

export const feeInputLine = z.object({
  description: z
    .string()
    .min(1, "Descripción del gasto")
    .max(500, "Máx. 500 caracteres")
    .trim(),
  amount: decimalLike,
  currencyCode: z.enum(["ARS", "USD"]),
  fxRateToCollectionCurrency: decimalLike,
});

export const allocationsArraySchema = z
  .array(allocationInputLine)
  .min(1, "Al menos una imputación a venta")
  .max(MAX_ALLOCATION_LINES, "Demasiadas imputaciones");

export const feesArraySchema = z.array(feeInputLine).max(MAX_FEE_LINES, "Demasiados gastos");

const usdTasaForCollection = (data: { currencyCode: string; fxRateArsPerUnitUsdAtCollection?: string | undefined }, ctx: z.RefinementCtx) => {
  if (data.currencyCode === "USD") {
    const r = data.fxRateArsPerUnitUsdAtCollection;
    if (r == null || r === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresá la tasa (ARS por USD) para cobranzas en dólares",
        path: ["fxRateArsPerUnitUsdAtCollection"],
      });
      return;
    }
    const n = new Prisma.Decimal(String(r).replace(",", ".").trim());
    if (n.lte(0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La tasa debe ser mayor a 0",
        path: ["fxRateArsPerUnitUsdAtCollection"],
      });
    }
  }
};

export const createCollectionFormSchema = z
  .object({
    collectionDate: z.string().min(1, "Elegí la fecha de cobranza"),
    currencyCode: z.enum(["ARS", "USD"]),
    grossAmount: decimalLike,
    paymentMethodCode: z
      .string()
      .optional()
      .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim().slice(0, 80))),
    notes: z
      .string()
      .optional()
      .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim().slice(0, 4000))),
    fxRateArsPerUnitUsdAtCollection: optionalDecimal,
    allocationsJson: z.string().min(1, "Falta imputación"),
    feesJson: z.string().optional().default("[]"),
  })
  .superRefine((data, ctx) => {
    usdTasaForCollection(data, ctx);
  });

export function parseCreateCollectionForm(raw: ReturnType<typeof formDataToObject>) {
  return createCollectionFormSchema.safeParse({
    collectionDate: raw.collectionDate,
    currencyCode: raw.currencyCode,
    grossAmount: raw.grossAmount,
    paymentMethodCode: raw.paymentMethodCode,
    notes: raw.notes,
    fxRateArsPerUnitUsdAtCollection: raw.fxRateArsPerUnitUsdAtCollection,
    allocationsJson: raw.allocationsJson,
    feesJson: raw.feesJson,
  });
}

export function safeParseJsonAllocations(
  s: string | undefined,
): { ok: true; data: z.infer<typeof allocationsArraySchema> } | { ok: false; error: string } {
  if (s == null || s.trim() === "") {
    return { ok: false, error: "Falta imputación" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(s) as unknown;
  } catch {
    return { ok: false, error: "Imputaciones: JSON inválido" };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Imputaciones: se esperaba un arreglo" };
  }
  const r = allocationsArraySchema.safeParse(parsed);
  if (!r.success) {
    return { ok: false, error: r.error.issues[0]?.message ?? "Imputaciones inválidas" };
  }
  return { ok: true, data: r.data };
}

export function safeParseJsonFees(
  s: string | undefined,
): { ok: true; data: z.infer<typeof feesArraySchema> } | { ok: false; error: string } {
  const t = s == null || s.trim() === "" ? "[]" : s;
  let parsed: unknown;
  try {
    parsed = JSON.parse(t) as unknown;
  } catch {
    return { ok: false, error: "Gastos: JSON inválido" };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Gastos: se esperaba un arreglo" };
  }
  const r = feesArraySchema.safeParse(parsed);
  if (!r.success) {
    return { ok: false, error: r.error.issues[0]?.message ?? "Gastos inválidos" };
  }
  return { ok: true, data: r.data };
}

export const voidCollectionSchema = z.object({
  voidReason: z
    .string()
    .min(3, "Indicá un motivo (mín. 3 caracteres)")
    .max(2000, "Máx. 2000 caracteres")
    .trim(),
});

export { formDataToObject };
