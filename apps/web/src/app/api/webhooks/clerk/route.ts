import { NextResponse } from "next/server";
import { Webhook } from "svix";

export const dynamic = "force-dynamic";

type ClerkWebhookHeaders = {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
};

function readSvixHeaders(request: Request): ClerkWebhookHeaders | null {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return null;
  return {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": signature,
  };
}

function eventTypeFromPayload(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "type" in payload) {
    const t = (payload as { type?: unknown }).type;
    return typeof t === "string" ? t : undefined;
  }
  return undefined;
}

/**
 * Webhook Clerk (Svix). Verificación de firma obligatoria en producción si se expone el endpoint.
 * Procesamiento de eventos: mínimo (ack + tipo); la sincronización principal sigue en `syncClerkUserToDatabase` (layout).
 */
export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    return NextResponse.json(
      {
        error:
          "Configurá CLERK_WEBHOOK_SECRET (Signing secret del endpoint en Clerk) para aceptar webhooks en producción.",
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  if (!secret) {
    return NextResponse.json(
      {
        received: true,
        verified: false,
        warning:
          "Sin CLERK_WEBHOOK_SECRET no se verifica la firma (solo desarrollo). No usar así en producción.",
      },
      { status: 200 },
    );
  }

  const svixHeaders = readSvixHeaders(request);

  if (!svixHeaders) {
    return NextResponse.json({ error: "Faltan cabeceras Svix (svix-id, svix-timestamp, svix-signature)" }, { status: 400 });
  }

  let payload: unknown;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, svixHeaders);
  } catch {
    return NextResponse.json({ error: "Firma o cuerpo del webhook inválido" }, { status: 401 });
  }

  const eventType = eventTypeFromPayload(payload);

  // Skeleton: acá iría user.created / session.* / etc. sin rehacer auth en esta pasada.
  void eventType;

  return NextResponse.json(
    {
      received: true,
      verified: true,
      eventType: eventType ?? "unknown",
      note: "Eventos no procesan negocio aún; sync de usuario en layout.",
    },
    { status: 200 },
  );
}
