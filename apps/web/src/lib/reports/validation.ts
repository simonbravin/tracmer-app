import { z } from "zod";

import { saleStatusesForList } from "@/lib/sales/status";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const currency = z.enum(["ARS", "USD"] as const).optional();
const vis = z.enum(["activas", "archivadas", "todas"] as const);

const saleStatus = z
  .string()
  .optional()
  .refine(
    (s) => s == null || s === "" || (saleStatusesForList as readonly string[]).includes(s),
    "Estado de venta inválido",
  )
  .transform((s) => (s == null || s === "" ? undefined : (s as (typeof saleStatusesForList)[number])));

/** Rango de fechas (sin `refine`: `.extend` no existe en `ZodEffects`). */
const reportDateFilterObject = z.object({
  desde: ymd,
  hasta: ymd,
});

const orderDesdeHasta: { path: (string | number)[]; message: string } = {
  path: ["hasta"],
  message: "Hasta no puede ser anterior a desde",
};

export const ventasReportFilterSchema = reportDateFilterObject
  .extend({
    visibilidad: vis.default("activas"),
    clientId: z
      .string()
      .optional()
      .transform((s) => (s == null || s === "" ? undefined : s)),
    estado: saleStatus,
    moneda: currency,
  })
  .refine((d) => d.desde <= d.hasta, orderDesdeHasta);

export const cobranzasReportFilterSchema = reportDateFilterObject
  .extend({
    visibilidad: vis.default("activas"),
    clientId: z
      .string()
      .optional()
      .transform((s) => (s == null || s === "" ? undefined : s)),
    moneda: currency,
  })
  .refine((d) => d.desde <= d.hasta, orderDesdeHasta);

export const depositosReportFilterSchema = reportDateFilterObject
  .extend({
    visibilidad: vis.default("activas"),
    bankAccountId: z
      .string()
      .optional()
      .transform((s) => (s == null || s === "" ? undefined : s)),
    moneda: currency,
  })
  .refine((d) => d.desde <= d.hasta, orderDesdeHasta);

export const conciliacionesReportFilterSchema = reportDateFilterObject
  .extend({
    visibilidad: vis.default("activas"),
    status: z.enum(["draft", "closed", "voided"] as const).optional(),
    porFecha: z.enum(["created", "closed"] as const).default("closed"),
  })
  .refine((d) => d.desde <= d.hasta, orderDesdeHasta);

export const clientesReportFilterSchema = z.object({
  q: z
    .string()
    .optional()
    .transform((s) => (s == null || s === "" ? undefined : s.slice(0, 200))),
});

export const exportRequestSchema = z.discriminatedUnion("report", [
  z.object({ format: z.enum(["xlsx", "pdf", "csv"]), report: z.literal("ventas"), filter: ventasReportFilterSchema }),
  z.object({ format: z.enum(["xlsx", "pdf", "csv"]), report: z.literal("cobranzas"), filter: cobranzasReportFilterSchema }),
  z.object({ format: z.enum(["xlsx", "pdf", "csv"]), report: z.literal("depositos"), filter: depositosReportFilterSchema }),
  z.object({
    format: z.enum(["xlsx", "pdf", "csv"]),
    report: z.literal("conciliaciones"),
    filter: conciliacionesReportFilterSchema,
  }),
  z.object({ format: z.enum(["xlsx", "pdf", "csv"]), report: z.literal("clientes"), filter: clientesReportFilterSchema }),
]);

/** Tipo explícito: con `z.infer<discriminatedUnion>` algunas versiones infieren `report: unknown` en el cliente del build. */
export type ExportRequest =
  | { format: "xlsx" | "pdf" | "csv"; report: "ventas"; filter: z.infer<typeof ventasReportFilterSchema> }
  | { format: "xlsx" | "pdf" | "csv"; report: "cobranzas"; filter: z.infer<typeof cobranzasReportFilterSchema> }
  | { format: "xlsx" | "pdf" | "csv"; report: "depositos"; filter: z.infer<typeof depositosReportFilterSchema> }
  | { format: "xlsx" | "pdf" | "csv"; report: "conciliaciones"; filter: z.infer<typeof conciliacionesReportFilterSchema> }
  | { format: "xlsx" | "pdf" | "csv"; report: "clientes"; filter: z.infer<typeof clientesReportFilterSchema> };

/**
 * Cuerpo JSON de POST /api/reports/export: `{ "format": "xlsx", "report": "ventas", "filter": { ... } }`
 */
export function safeParseExportBody(
  body: unknown,
):
  | { ok: true; data: ExportRequest }
  | { ok: false; error: string } {
  const parsed = exportRequestSchema.safeParse(body);
  if (parsed.success) {
    return { ok: true, data: parsed.data as ExportRequest };
  }
  return { ok: false, error: "Cuerpo inválido" };
}

export function defaultDateRangeYmd() {
  const t = new Date();
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  const desde = `${y}-${m}-01`;
  const hasta = `${y}-${m}-${d}`;
  return { desde, hasta };
}

// --- URL parsers for report subpages (GET) —

export function parseVentasFilters(sp: URLSearchParams) {
  const dr = defaultDateRangeYmd();
  return ventasReportFilterSchema.safeParse({
    desde: sp.get("desde") || dr.desde,
    hasta: sp.get("hasta") || dr.hasta,
    visibilidad: (sp.get("visibilidad") as "activas" | "archivadas" | "todas") || "activas",
    clientId: sp.get("cliente") || undefined,
    estado: sp.get("estado") || undefined,
    moneda: (sp.get("moneda") || undefined) as "ARS" | "USD" | undefined,
  });
}

export function parseCobranzasFilters(sp: URLSearchParams) {
  const dr = defaultDateRangeYmd();
  return cobranzasReportFilterSchema.safeParse({
    desde: sp.get("desde") || dr.desde,
    hasta: sp.get("hasta") || dr.hasta,
    visibilidad: (sp.get("visibilidad") as "activas" | "archivadas" | "todas") || "activas",
    clientId: sp.get("cliente") || undefined,
    moneda: (sp.get("moneda") || undefined) as "ARS" | "USD" | undefined,
  });
}

export function parseDepositosFilters(sp: URLSearchParams) {
  const dr = defaultDateRangeYmd();
  return depositosReportFilterSchema.safeParse({
    desde: sp.get("desde") || dr.desde,
    hasta: sp.get("hasta") || dr.hasta,
    visibilidad: (sp.get("visibilidad") as "activas" | "archivadas" | "todas") || "activas",
    bankAccountId: sp.get("cuenta") || undefined,
    moneda: (sp.get("moneda") || undefined) as "ARS" | "USD" | undefined,
  });
}

export function parseConciliacionesFilters(sp: URLSearchParams) {
  const dr = defaultDateRangeYmd();
  return conciliacionesReportFilterSchema.safeParse({
    desde: sp.get("desde") || dr.desde,
    hasta: sp.get("hasta") || dr.hasta,
    visibilidad: (sp.get("visibilidad") as "activas" | "archivadas" | "todas") || "activas",
    status: (sp.get("estado") || undefined) as "draft" | "closed" | "voided" | undefined,
    porFecha: (sp.get("porFecha") as "created" | "closed") || "closed",
  });
}

export function parseClientesFilters(sp: URLSearchParams) {
  return clientesReportFilterSchema.safeParse({ q: sp.get("q") || undefined });
}
