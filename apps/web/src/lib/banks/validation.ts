import { z } from "zod";
import { Prisma } from "@prisma/client";

import { formDataToObject } from "@/lib/clients/validation";

const optionalDecimal = z
  .string()
  .optional()
  .transform((v) => (v == null || v.trim() === "" ? undefined : v))
  .refine((v) => v == null || v === "" || !Number.isNaN(Number(String(v).replace(",", "."))), {
    message: "Número no válido",
  });

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

export const bankAccountFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200).trim(),
  bankName: z.string().min(1, "El banco es obligatorio").max(200).trim(),
  currencyCode: z.enum(["ARS", "USD"]),
  accountIdentifierMasked: z
    .string()
    .min(1, "Indicá referencia o Nº de cuenta (enmascarado)")
    .max(120)
    .trim(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v == null || v === "true" ? true : false)),
});

const depositBase = z
  .object({
    bankAccountId: z.string().cuid("Elegí una cuenta"),
    depositDate: z.string().min(1, "Elegí la fecha"),
    currencyCode: z.enum(["ARS", "USD"]),
    amount: decimalLike,
    reference: z
      .string()
      .optional()
      .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim().slice(0, 120))),
    fxRateArsPerUnitUsdAtDeposit: optionalDecimal,
  })
  .superRefine((d, ctx) => {
    if (d.currencyCode === "USD") {
      const r = d.fxRateArsPerUnitUsdAtDeposit;
      if (r == null || r === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá la tasa (ARS por USD) para depósitos en dólares",
          path: ["fxRateArsPerUnitUsdAtDeposit"],
        });
        return;
      }
      if (new Prisma.Decimal(String(r).replace(",", ".").trim()).lte(0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La tasa debe ser > 0", path: ["fxRateArsPerUnitUsdAtDeposit"] });
      }
    }
  });

export const bankDepositFormSchema = depositBase;

export function parseBankAccountForm(raw: ReturnType<typeof formDataToObject>) {
  return bankAccountFormSchema.safeParse({
    name: raw.name,
    bankName: raw.bankName,
    currencyCode: raw.currencyCode,
    accountIdentifierMasked: raw.accountIdentifierMasked,
    isActive: (raw as { isActive?: string }).isActive === "false" ? "false" : "true",
  });
}

export function parseBankDepositForm(raw: ReturnType<typeof formDataToObject>) {
  return bankDepositFormSchema.safeParse({
    bankAccountId: raw.bankAccountId,
    depositDate: raw.depositDate,
    currencyCode: raw.currencyCode,
    amount: raw.amount,
    reference: raw.reference,
    fxRateArsPerUnitUsdAtDeposit: raw.fxRateArsPerUnitUsdAtDeposit,
  });
}

export { formDataToObject };
