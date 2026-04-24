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

const transferBase = z.object({
  fromBankAccountId: z.string().cuid("Elegí cuenta origen"),
  toBankAccountId: z.string().cuid("Elegí cuenta destino"),
  transferDate: z.string().min(1, "Elegí la fecha"),
  amount: decimalLike,
  feeAmount: optionalDecimal,
  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim())),
});

export const bankTransferFormSchema = transferBase.superRefine((d, ctx) => {
  if (d.fromBankAccountId === d.toBankAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La cuenta destino debe ser distinta del origen",
      path: ["toBankAccountId"],
    });
  }
  const f = d.feeAmount;
  if (f != null && f !== "") {
    const n = new Prisma.Decimal(String(f).replace(",", ".").trim());
    if (n.lt(0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La comisión no puede ser negativa", path: ["feeAmount"] });
    }
  }
});

export function parseBankTransferForm(raw: ReturnType<typeof formDataToObject>) {
  return bankTransferFormSchema.safeParse({
    fromBankAccountId: raw.fromBankAccountId,
    toBankAccountId: raw.toBankAccountId,
    transferDate: raw.transferDate,
    amount: raw.amount,
    feeAmount: raw.feeAmount,
    notes: raw.notes,
  });
}

export { formDataToObject };
