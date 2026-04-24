"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";
import { Resend } from "resend";

import { getPublicBaseUrl } from "@/lib/auth/public-base-url";
import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

import { ALL_EMAIL_TYPE_CODES } from "./constants";
import { parseAlertSettingsForm, parseRecipientBlock } from "./validation";

const CONFIG_PATH = "/configuracion/alertas";

export type AlertSettingsActionState =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function typesForDb(d: { emailEnabled: boolean; emailTypes: string[] }): string[] | null {
  if (!d.emailEnabled) return null;
  if (d.emailTypes.length >= ALL_EMAIL_TYPE_CODES.length) return null;
  return d.emailTypes;
}

export async function updateOrganizationAlertSettings(
  _prev: AlertSettingsActionState | null,
  formData: FormData,
): Promise<AlertSettingsActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.settings.manage);
  if (denied) {
    return { success: false, error: denied };
  }
  const parsed = parseAlertSettingsForm(formData);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revisá el formulario", fieldErrors: fe };
  }
  const d = parsed.data;
  const recStr = d.emailEnabled ? parseRecipientBlock(d.emailRecipients).join(", ") : null;
  const types = typesForDb(d);

  try {
    const jsonTypes: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
      types === null ? Prisma.DbNull : (types as Prisma.InputJsonValue);
    await prisma.organizationAlertSettings.upsert({
      where: { organizationId: org.ctx.organizationId },
      create: {
        organizationId: org.ctx.organizationId,
        emailEnabled: d.emailEnabled,
        emailRecipients: recStr,
        emailAlertTypes: jsonTypes,
      },
      update: {
        emailEnabled: d.emailEnabled,
        emailRecipients: recStr,
        emailAlertTypes: jsonTypes,
      },
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error && process.env.NODE_ENV === "development" ? e.message : "No se pudo guardar.",
    };
  }
  revalidatePath(CONFIG_PATH);
  return { success: true, message: "Preferencias guardadas." };
}

/** Envía un correo de prueba al primer destinatario (requiere Resend en el entorno). */
export async function sendTestAlertSettingsEmail(): Promise<AlertSettingsActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.settings.manage);
  if (denied) {
    return { success: false, error: denied };
  }
  const row = await prisma.organizationAlertSettings.findUnique({
    where: { organizationId: org.ctx.organizationId },
  });
  if (!row?.emailEnabled) {
    return { success: false, error: "Activá y guardá notificaciones por email antes de probar." };
  }
  const emails = row.emailRecipients ? parseRecipientBlock(row.emailRecipients) : [];
  if (emails.length === 0) {
    return { success: false, error: "No hay destinatarios. Guardá al menos un email." };
  }
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from) {
    return { success: false, error: "Falta RESEND_API_KEY o RESEND_FROM en el servidor." };
  }
  const to = emails[0];
  if (!to) {
    return { success: false, error: "Destinatario no válido." };
  }
  const orgName = await prisma.organization
    .findFirst({ where: { id: org.ctx.organizationId } })
    .then((o) => o?.name ?? "Organización");
  const base = getPublicBaseUrl();
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Prueba · Notificaciones de alertas · ${orgName} · Tracmer`,
    text: `Este es un correo de prueba. Si lo recibís, la app puede enviar alertas a ${to}.\n\n` +
      `Equipo: ${orgName}.\n` +
      `El resumen diario (máx. 1 por día UTC) se envía cuando un programador llama a POST /api/jobs/run-alert-emails (ver despliegue).\n\n` +
      `Alertas: ${base}/alertas\n` +
      `Configuración: ${base}/configuracion/alertas\n`,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, message: `Correo de prueba enviado a ${to}.` };
}
