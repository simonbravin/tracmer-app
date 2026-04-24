import { z } from "zod";

const optTrim = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label}: máx. ${max} caracteres`)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim()));

export const profileFormSchema = z.object({
  name: optTrim(200, "Nombre"),
  displayName: optTrim(200, "Nombre a mostrar"),
  phone: optTrim(100, "Teléfono"),
  jobTitle: optTrim(200, "Cargo"),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;

export function formDataToObject(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") o[k] = v;
  }
  return o;
}
