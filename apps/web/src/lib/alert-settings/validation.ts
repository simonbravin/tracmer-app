import { z } from "zod";

import { formDataToObject } from "@/lib/clients/validation";

import { ALL_EMAIL_TYPE_CODES } from "./constants";

const emailLine = z.string().email("Email no válido").max(320);

function parseRecipientBlock(raw: string): string[] {
  return raw
    .split(/[\n,;]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const allowed = new Set<string>(ALL_EMAIL_TYPE_CODES);

export const alertSettingsFormSchema = z
  .object({
    emailEnabled: z.boolean(),
    emailRecipients: z.string().max(20_000).transform((s) => s.trim()),
    emailTypes: z.array(z.string()),
  })
  .superRefine((d, ctx) => {
    const bad = d.emailTypes.filter((t) => !allowed.has(t));
    if (bad.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de alerta no válido", path: ["emailTypes"] });
    }
    if (!d.emailEnabled) return;
    if (d.emailTypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Elegí al menos un tipo de alerta para email.",
        path: ["emailTypes"],
      });
      return;
    }
    const emails = parseRecipientBlock(d.emailRecipients);
    if (emails.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Con notificaciones por email activas, indicá al menos un correo.",
        path: ["emailRecipients"],
      });
      return;
    }
    for (const e of emails) {
      const r = emailLine.safeParse(e);
      if (!r.success) {
        const msg = r.error.issues[0]?.message ?? "Email inválido";
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg,
          path: ["emailRecipients"],
        });
        return;
      }
    }
  });

export type AlertSettingsFormInput = z.infer<typeof alertSettingsFormSchema>;

export function parseAlertSettingsForm(fd: FormData) {
  const raw = formDataToObject(fd);
  const types = fd.getAll("emailTypes").filter((v): v is string => typeof v === "string");
  return alertSettingsFormSchema.safeParse({
    emailEnabled: fd.get("emailEnabled") === "true",
    emailRecipients: String(raw.emailRecipients ?? ""),
    emailTypes: types,
  });
}

export { parseRecipientBlock };
