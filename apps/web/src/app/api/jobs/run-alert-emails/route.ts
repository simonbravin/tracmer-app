import { NextResponse } from "next/server";

import { runAlertDigestEmails } from "@/lib/alerts/run-alert-digest-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Resumen diario de alertas por email. Invocar desde un programador (GitHub Actions, Vercel Cron
 * con header propio, etc.) con `Authorization: Bearer $CRON_SECRET` — mismo esquema que
 * `POST /api/jobs/run-reports`.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "configurar CRON_SECRET en producción para proteger este endpoint" },
      { status: 503 },
    );
  }
  const result = await runAlertDigestEmails();
  return NextResponse.json(result);
}
