import { z } from "zod";
import { Prisma } from "@prisma/client";
import { formDataToObject } from "@/lib/clients/validation";

const cuid = z.string().cuid("Identificador no válido");

const decimalLine = z
  .string()
  .min(1, "Ingresá un importe")
  .transform((s) => s.trim().replace(/\s/g, ""))
  .refine(
    (s) => {
      const t = s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s;
      return !Number.isNaN(Number(t)) && Number.isFinite(Number(t));
    },
    { message: "Importe no válido" },
  )
  .transform((s) => (s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s));

const lineIn = z.object({
  collectionId: cuid,
  bankDepositId: cuid,
  amount: decimalLine,
});

export const reconciliationLinesPayloadSchema = z
  .object({ lines: z.array(lineIn).min(1, "Agregá al menos una línea de conciliación") })
  .superRefine((d, ctx) => {
    for (let i = 0; i < d.lines.length; i += 1) {
      const amount = new Prisma.Decimal(d.lines[i].amount);
      if (amount.lte(0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lines", i, "amount"], message: "El monto debe ser > 0" });
      }
    }
  });

export const discrepancyItemSchema = z.object({
  categoryCode: z.enum([
    "commission",
    "rounding",
    "fx_deviation",
    "unidentified_income",
    "other",
  ]),
  amount: decimalLine,
  currencyCode: z.enum(["ARS", "USD"]),
  notes: z
    .string()
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim().slice(0, 500))),
  lineId: cuid.optional().nullable(),
});

export const closeDiscrepanciesSchema = z.array(discrepancyItemSchema);

export function parseReconciliationLinesJson(s: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(s);
  } catch {
    return { success: false, error: "Líneas: JSON no válido" } as const;
  }
  if (!raw || typeof raw !== "object" || !("lines" in (raw as object))) {
    return { success: false, error: "Líneas: formato inválido" } as const;
  }
  return reconciliationLinesPayloadSchema.safeParse(raw);
}

export { formDataToObject };
export type ReconciliationLineInput = z.infer<typeof lineIn>;