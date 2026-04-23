import { z } from "zod";
import { Prisma, SaleStatus } from "@prisma/client";

import { formDataToObject } from "@/lib/clients/validation";

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

export const saleFormSchema = z
  .object({
    clientId: z.string().cuid("Elegí un cliente"),
    invoiceDate: z.string().min(1, "Elegí la fecha de factura"),
    creditDays: z
      .string()
      .transform((s) => Number.parseInt(s, 10))
      .refine((n) => Number.isFinite(n) && n >= 0, "Los días de crédito deben ser ≥ 0"),
    currencyCode: z.enum(["ARS", "USD"]),
    totalAmount: decimalLike,
    /** ARS por 1 USD, obligatorio en USD para guardar equivalente */
    fxRateArsPerUnitUsdAtIssue: optionalDecimal,
    invoiceNumber: z
      .string()
      .optional()
      .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim())),
    status: z.enum(["draft", "issued"] as const),
  })
  .superRefine((data, ctx) => {
    if (data.currencyCode === "USD") {
      const r = data.fxRateArsPerUnitUsdAtIssue;
      if (r == null || r === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá la tasa (ARS por USD) para facturas en dólares",
          path: ["fxRateArsPerUnitUsdAtIssue"],
        });
        return;
      }
      const n = new Prisma.Decimal(String(r).replace(",", ".").trim());
      if (n.lte(0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La tasa debe ser mayor a 0",
          path: ["fxRateArsPerUnitUsdAtIssue"],
        });
      }
    }
  });

export const saleUpdateSchema = z
  .object({
    clientId: z.string().cuid("Elegí un cliente"),
    invoiceDate: z.string().min(1, "Elegí la fecha de factura"),
    creditDays: z
      .string()
      .transform((s) => Number.parseInt(s, 10))
      .refine((n) => Number.isFinite(n) && n >= 0, "Los días de crédito deben ser ≥ 0"),
    currencyCode: z.enum(["ARS", "USD"]),
    totalAmount: decimalLike,
    fxRateArsPerUnitUsdAtIssue: optionalDecimal,
    invoiceNumber: z
      .string()
      .optional()
      .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim())),
    status: z.nativeEnum(SaleStatus),
  })
  .superRefine((data, ctx) => {
    if (data.currencyCode === "USD") {
      const r = data.fxRateArsPerUnitUsdAtIssue;
      if (r == null || r === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá la tasa (ARS por USD) para facturas en dólares",
          path: ["fxRateArsPerUnitUsdAtIssue"],
        });
        return;
      }
      const n = new Prisma.Decimal(String(r).replace(",", ".").trim());
      if (n.lte(0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La tasa debe ser mayor a 0",
          path: ["fxRateArsPerUnitUsdAtIssue"],
        });
      }
    }
  });

export type SaleFormInput = z.infer<typeof saleFormSchema>;
export { formDataToObject };
