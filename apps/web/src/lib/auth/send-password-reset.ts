import "server-only";

import { Resend } from "resend";

import { getPublicBaseUrl } from "@/lib/auth/public-base-url";

export async function sendPasswordResetEmail(
  toEmail: string,
  token: string,
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
  const link = `${base}/login/restablecer?token=${encodeURIComponent(token)}`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: "Restablecer contraseña · Tracmer",
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\nSi fuiste vos, abrí este enlace (válido por 1 hora):\n${link}\n\nSi no pediste el cambio, ignorá este correo.`,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Error de Resend" };
  }
  return { ok: true };
}
