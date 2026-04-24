import { z } from "zod";

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/**
 * CUIT / CUIL argentino: 11 dígitos (puede venir con guiones).
 * Opcional en cliente; vacío = sin identificación fiscal.
 */
const optionalTaxId = z
  .string()
  .optional()
  .transform((v) => (v == null ? "" : v.trim()))
  .refine(
    (v) => {
      if (v.length === 0) return true;
      const d = digitsOnly(v);
      return d.length === 11;
    },
    { message: "El CUIT / CUIL debe tener 11 dígitos" },
  )
  .transform((v) => (v.length === 0 ? undefined : digitsOnly(v)));

const optionalTrim = (max: number) =>
  z
    .string()
    .max(max, `Máx. ${max} caracteres`)
    .transform((v) => (v.trim() === "" ? undefined : v.trim()));

const optionalEmailField = z
  .string()
  .max(500)
  .transform((v) => (v.trim() === "" ? undefined : v.trim().toLowerCase()))
  .refine(
    (v) => v == null || z.string().email().safeParse(v).success,
    { message: "Email no válido" },
  );

export const clientFormSchema = z.object({
  legalName: z
    .string()
    .min(1, "La razón social es obligatoria")
    .max(500, "Máx. 500 caracteres")
    .trim(),
  displayName: z
    .string()
    .min(1, "El nombre a mostrar es obligatorio")
    .max(500, "Máx. 500 caracteres")
    .trim(),
  taxId: optionalTaxId,
  address: optionalTrim(2000),
  phone: optionalTrim(100),
  email: optionalEmailField,
  website: optionalTrim(500),
  contactName: optionalTrim(300),
  notes: z
    .string()
    .max(20_000, "Las notas son demasiado largas")
    .optional()
    .transform((v) => (v == null || v === "" ? undefined : v)),
});

export type ClientFormInput = z.infer<typeof clientFormSchema>;

export const clientContactFormSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre del contacto es obligatorio")
    .max(300, "Máx. 300 caracteres")
    .trim(),
  email: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim().toLowerCase()))
    .refine(
      (v) => v == null || z.string().email().safeParse(v).success,
      { message: "Email no válido" },
    ),
  phone: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim())),
  roleLabel: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim())),
});

export type ClientContactFormInput = z.infer<typeof clientContactFormSchema>;

export function formDataToObject(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") o[k] = v;
  }
  return o;
}
