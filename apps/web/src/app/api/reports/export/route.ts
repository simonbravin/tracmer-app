import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { isPermissionDenied, requirePermission } from "@/lib/permissions/server";
import { runReport } from "@/lib/reports/data";
import { tableToCsvString } from "@/lib/reports/format-csv";
import { tableToXlsxBuffer } from "@/lib/reports/format-excel";
import { tableToPdfBuffer } from "@/lib/reports/format-pdf";
import { safeParseExportBody } from "@/lib/reports/validation";

export const dynamic = "force-dynamic";

function fileBase(report: string, filter: object) {
  if (
    "desde" in filter &&
    "hasta" in filter &&
    typeof (filter as { desde?: string }).desde === "string" &&
    typeof (filter as { hasta?: string }).hasta === "string" &&
    (filter as { desde: string }).desde &&
    (filter as { hasta: string }).hasta
  ) {
    return `${report}-${(filter as { desde: string }).desde}_${(filter as { hasta: string }).hasta}`.replace(
      /[^\w\-.]+/g,
      "_",
    );
  }
  return `${report}-${new Date().toISOString().slice(0, 10)}`.replace(/[^\w\-.]+/g, "_");
}

function mime(f: "xlsx" | "pdf" | "csv") {
  if (f === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
  }
  if (f === "pdf") {
    return "application/pdf" as const;
  }
  return "text/csv; charset=utf-8" as const;
}

function ext(f: "xlsx" | "pdf" | "csv") {
  return f;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("No autorizado", { status: 401 });
  }
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return new NextResponse("Se requiere organización", { status: 403 });
  }
  const role = ctx.primaryMembership?.role;
  if (!role) {
    return new NextResponse("Se requiere rol en la organización", { status: 403 });
  }
  try {
    await requirePermission(ctx.currentOrganizationId, role.id, role.code, P.reports.export);
  } catch (e) {
    if (isPermissionDenied(e)) {
      return new NextResponse(e.message, { status: 403 });
    }
    throw e;
  }
  const orgId = ctx.currentOrganizationId;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = safeParseExportBody(json);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const d = parsed.data;
  const { format, ...runInput } = d;
  const table = await runReport(orgId, runInput, { limit: 10_000 });
  const base = fileBase(d.report, d.filter);
  const filename = `${base}.${ext(format)}`;
  const cd = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  if (format === "xlsx") {
    const buf = await tableToXlsxBuffer(table, table.title);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Disposition": cd, "Content-Type": mime("xlsx") } });
  }
  if (format === "pdf") {
    const buf = await tableToPdfBuffer(table, new Date());
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Disposition": cd, "Content-Type": mime("pdf") } });
  }
  const csv = tableToCsvString(table);
  return new NextResponse(csv, { headers: { "Content-Disposition": cd, "Content-Type": mime("csv") } });
}
