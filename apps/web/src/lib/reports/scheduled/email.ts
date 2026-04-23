import { Resend } from "resend";

function getResend() {
  const k = process.env.RESEND_API_KEY?.trim();
  if (!k) return null;
  return new Resend(k);
}

function getFromAddress(): string | null {
  const f = process.env.RESEND_FROM?.trim();
  if (f) return f;
  return null;
}

type Attachment = { filename: string; content: Buffer; mime: string };

export type SendReportEmailInput = {
  to: { email: string; name?: string }[];
  subject: string;
  textBody: string;
  reportTitle: string;
  attachment: Attachment;
};

/**
 * Envío con Resend. Requiere `RESEND_API_KEY` y, en producción, un dominio verificado en `RESEND_FROM`.
 * Sin clave, devuelve un error explicativo (no se simula “éxito”).
 */
export async function sendReportByEmail(
  input: SendReportEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "Falta RESEND_API_KEY en el servidor" };
  }
  const from = getFromAddress();
  if (!from) {
    return { ok: false, error: "Falta RESEND_FROM (remitente verificado p. ej. noreply@tudominio.com)" };
  }
  if (input.to.length === 0) {
    return { ok: false, error: "No hay destinatarios" };
  }
  const { data, error } = await resend.emails.send({
    from,
    to: input.to.map((t) => t.email),
    subject: input.subject,
    text: input.textBody,
    attachments: [
      {
        filename: input.attachment.filename,
        content: input.attachment.content,
        contentType: input.attachment.mime,
      },
    ],
  });
  if (error) {
    return { ok: false, error: error.message ?? "Error de Resend" };
  }
  if (!data?.id) {
    return { ok: false, error: "Respuesta de Resend inesperada" };
  }
  return { ok: true };
}
