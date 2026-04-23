import "server-only";

import { Resend } from "resend";

import { getPublicBaseUrl } from "@/lib/auth/public-base-url";

export async function sendMembershipInvitationEmail(
  toEmail: string,
  rawToken: string,
  organizationName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey) {
    return { ok: false, error: "Falta RESEND_API_KEY" };
  }
  if (!from) {
    return { ok: false, error: "Falta RESEND_FROM" };
  }

  const base = getPublicBaseUrl();
  const link = `${base}/invitacion/aceptar?token=${encodeURIComponent(rawToken)}`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: `Invitación a ${organizationName} · Tracmer`,
    text: `Te invitaron a unirte a "${organizationName}" en Tracmer.\n\nAbrí el enlace para aceptar (válido por 7 días):\n${link}\n\nSi no esperabas este correo, ignoralo.`,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Error de Resend" };
  }
  return { ok: true };
}
