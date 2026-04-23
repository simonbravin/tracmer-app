import "server-only";

import { Prisma, ReportRunStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { runReport } from "@/lib/reports/data";
import { tableToXlsxBuffer } from "@/lib/reports/format-excel";
import { tableToPdfBuffer } from "@/lib/reports/format-pdf";
import { reportLabels, type ReportKey } from "@/lib/reports/types";
import { defaultDateRangeYmd } from "@/lib/reports/validation";

import { sendReportByEmail } from "./email";
import { computeIdempotencyKey, isInExecutionWindow } from "./period";
import { type ParametersOverride, parametersOverrideSchema, type StoredReportParameters, storedReportParametersSchema } from "./validation";

const EXEC_WINDOW_MIN = 30;

type ScheduleWithRelations = {
  id: string;
  organizationId: string;
  timezone: string;
  isActive: boolean;
  parametersOverride: Prisma.JsonValue | null;
} & { reportDefinition: { id: string; name: string; defaultParameters: Prisma.JsonValue | null; reportType: string; organization: { name: string } | null } | null; recipients: { id: string; email: string; name: string | null }[] };

function fileNameBaseForEmail(report: ReportKey, filter: object): string {
  const def = defaultDateRangeYmd();
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
  return `${report}-${def.hasta}`.replace(/[^\w\-.]+/g, "_");
}

function extForFormat(f: "xlsx" | "pdf") {
  return f;
}

function parseStored(stored: Prisma.JsonValue | null):
  | { ok: true; data: StoredReportParameters }
  | { ok: false; error: string } {
  const parsed = storedReportParametersSchema.safeParse(stored);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return { ok: false, error: "Parámetros almacenados del reporte inválidos" };
}

function parseOverride(ov: Prisma.JsonValue | null): { ok: true; data: ParametersOverride } | { ok: false; error: string } {
  const parsed = parametersOverrideSchema.safeParse(ov);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return { ok: false, error: "Configuración de frecuencia (parametersOverride) inválida" };
}

async function runOne(
  s: ScheduleWithRelations,
  orgId: string,
): Promise<{ result: "skipped" | "ok" | "err"; message?: string }> {
  const def = s.reportDefinition;
  if (!def) {
    return { result: "err", message: "Sin definición" };
  }
  if (!def.defaultParameters) {
    return { result: "err", message: "Sin defaultParameters" };
  }
  const ovr = parseOverride(s.parametersOverride);
  if (!ovr.ok) {
    return { result: "err", message: ovr.error };
  }
  const p = ovr.data.schedule;
  const sp = parseStored(def.defaultParameters);
  if (!sp.ok) {
    return { result: "err", message: sp.error };
  }
  const now = new Date();
  if (!s.isActive) {
    return { result: "skipped" };
  }
  if (!isInExecutionWindow(now, s.timezone, p.time, p, EXEC_WINDOW_MIN)) {
    return { result: "skipped" };
  }
  const idem = computeIdempotencyKey(s.id, s.timezone, p, now);
  const already = await prisma.reportRun.findFirst({
    where: {
      reportScheduleId: s.id,
      idempotencyKey: idem,
      status: "success" as ReportRunStatus,
    },
  });
  if (already) {
    return { result: "skipped" };
  }
  if (s.recipients.length === 0) {
    return { result: "err", message: "No hay destinatarios" };
  }
  if (def.reportType !== sp.data.report) {
    return { result: "err", message: "definición: reportType no coincide con parámetros" };
  }
  const reportKey = def.reportType as ReportKey;
  const format = sp.data.format;
  const { filter } = sp.data;
  const runInput = { report: sp.data.report, filter } as Parameters<typeof runReport>[1];
  let table: Awaited<ReturnType<typeof runReport>>;
  try {
    table = await runReport(orgId, runInput, { limit: 10_000 });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await prisma.reportRun.create({
      data: {
        organizationId: orgId,
        reportDefinitionId: def.id,
        reportScheduleId: s.id,
        status: "failed",
        startedAt: new Date(),
        finishedAt: new Date(),
        errorMessage: `Error al generar el reporte: ${err}`,
        idempotencyKey: idem,
      },
    });
    return { result: "err", message: err };
  }
  const base = fileNameBaseForEmail(reportKey, filter as object);
  const fileBase = `${base}-${Date.now()}`;
  let buffer: Buffer;
  let mime: string;
  if (format === "xlsx") {
    buffer = await tableToXlsxBuffer(table, table.title);
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    buffer = await tableToPdfBuffer(table, new Date());
    mime = "application/pdf";
  }
  const fileName = `${fileBase}.${extForFormat(format)}`.replace(/[^\w\-.]+/g, "_");
  const orgName = def.organization?.name?.trim() ?? "Organización";
  const subj = `[${orgName}] ${def.name} — ${reportLabels[reportKey]}`;
  const runRow = await prisma.reportRun.create({
    data: {
      organizationId: orgId,
      reportDefinitionId: def.id,
      reportScheduleId: s.id,
      status: "running" as const,
      startedAt: new Date(),
      idempotencyKey: idem,
    },
  });
  const text = [
    `Hola,`,
    ``,
    `Adjuntamos el reporte "${def.name}" generado de forma programada en tracmer-app.`,
    `Tipo: ${reportLabels[reportKey]}`,
    `Organización: ${orgName}`,
    ``,
    `Si no esperabas este correo, contactá a un administrador de tu espacio de trabajo.`,
  ].join("\n");
  const emailResult = await sendReportByEmail({
    to: s.recipients.map((r) => ({ email: r.email, name: r.name ?? undefined })),
    subject: subj,
    textBody: text,
    reportTitle: def.name,
    attachment: { filename: fileName, content: buffer, mime },
  });
  if (!emailResult.ok) {
    await prisma.reportRun.update({
      where: { id: runRow.id },
      data: { status: "failed", errorMessage: emailResult.error, finishedAt: new Date() },
    });
    return { result: "err", message: emailResult.error };
  }
  await prisma.reportRun.update({
    where: { id: runRow.id },
    data: { status: "success", errorMessage: null, finishedAt: new Date() },
  });
  return { result: "ok" };
}

export type RunScheduledReportsResult = {
  seen: number;
  skipped: number;
  success: number;
  failed: number;
  details: { scheduleId: string; outcome: "skipped" | "ok" | "err"; message?: string }[];
};

/**
 * Busca reportes programados activos, evalúa si corresponde ejecutar ahora
 * (ventana horaria, día semanal/mensual) y, si aplica, genera el archivo, envía por Resend
 * y registra `ReportRun`. Sin cron: llamar desde un job externo o a mano vía `POST /api/jobs/run-reports`.
 */
export async function runScheduledReports(): Promise<RunScheduledReportsResult> {
  const out: RunScheduledReportsResult = {
    seen: 0,
    skipped: 0,
    success: 0,
    failed: 0,
    details: [],
  };
  const list = (await prisma.reportSchedule.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      reportDefinition: { deletedAt: null },
    },
    include: {
      reportDefinition: { include: { organization: { select: { name: true } } } },
      recipients: { where: { deletedAt: null } },
    },
  })) as unknown as ScheduleWithRelations[];
  for (const s of list) {
    out.seen += 1;
    const one = await runOne(s, s.organizationId);
    if (one.result === "skipped") {
      out.skipped += 1;
    } else if (one.result === "ok") {
      out.success += 1;
    } else {
      out.failed += 1;
    }
    out.details.push({ scheduleId: s.id, outcome: one.result, message: one.message });
  }
  return out;
}
