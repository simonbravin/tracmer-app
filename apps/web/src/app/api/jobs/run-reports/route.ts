import { NextResponse } from "next/server";

import { runScheduledReports } from "@/lib/reports/scheduled/run-scheduled-reports";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Dispara el runner de reportes programados. Sin cron en la app: llamar desde un cron
 * externo (Vercel Cron, GitHub Actions, etc.) con `Authorization: Bearer $CRON_SECRET`.
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
  const result = await runScheduledReports();
  return NextResponse.json(result);
}
