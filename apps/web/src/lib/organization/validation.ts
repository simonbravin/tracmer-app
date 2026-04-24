import { z } from "zod";

const optionalLegal = z
  .string()
  .max(500, "Máx. 500 caracteres")
  .optional()
  .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim()));

export function organizationSettingsFormSchemaFor(allowedTimezones: readonly string[]) {
  const set = new Set(allowedTimezones);
  return z.object({
    name: z
      .string()
      .min(1, "El nombre es obligatorio")
      .max(200, "Máx. 200 caracteres")
      .trim(),
    legalName: optionalLegal,
    timezone: z
      .string()
      .min(1, "Elegí una zona horaria")
      .max(80, "Zona horaria inválida")
      .refine((tz) => set.has(tz), { message: "Zona horaria no admitida" }),
  });
}

export type OrganizationSettingsFormInput = z.infer<
  ReturnType<typeof organizationSettingsFormSchemaFor>
>;

export function formDataToObject(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") o[k] = v;
  }
  return o;
}
