import { z } from "zod";

import { parseInvoiceDateInput } from "@/lib/sales/data";

export const periodoValues = ["mes", "anio", "custom", "total"] as const;
export type PeriodoPreset = (typeof periodoValues)[number];

/** Inicio fijo del preset “Total” (todo el histórico coherente con filtros por fecha). */
export const DASHBOARD_TOTAL_DESDE = "1900-01-01";

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = parseInvoiceDateInput(s);
    return !Number.isNaN(d.getTime());
  }, "Fecha inválida");

export const dashboardQuerySchema = z
  .object({
    periodo: z.enum(periodoValues).default("mes"),
    desde: z.preprocess(
      (v) => (typeof v === "string" && v === "" ? undefined : v),
      ymd.optional(),
    ),
    hasta: z.preprocess(
      (v) => (typeof v === "string" && v === "" ? undefined : v),
      ymd.optional(),
    ),
    cliente: z
      .string()
      .optional()
      .transform((s) => (s == null || s === "" ? undefined : s)),
    q: z
      .string()
      .optional()
      .transform((s) => (s == null ? undefined : s.trim() || undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.periodo !== "custom") return;
    if (!data.desde || !data.hasta) {
      ctx.addIssue({
        code: "custom",
        path: data.desde ? ["hasta"] : ["desde"],
        message: "En rango personalizado, indicá desde y hasta",
      });
    } else {
      const a = parseInvoiceDateInput(data.desde);
      const b = parseInvoiceDateInput(data.hasta);
      if (a.getTime() > b.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["desde"],
          message: "“Desde” no puede ser posterior a “Hasta”",
        });
      }
    }
  });

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

function ymdFromUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function resolveDateRange(periodo: PeriodoPreset, desde: string | undefined, hasta: string | undefined, now = new Date()): { desde: string; hasta: string } {
  if (periodo === "custom" && desde && hasta) {
    return { desde, hasta };
  }
  if (periodo === "total") {
    return { desde: DASHBOARD_TOTAL_DESDE, hasta: ymdFromUtc(now) };
  }
  if (periodo === "anio") {
    const y = now.getUTCFullYear();
    return { desde: `${y}-01-01`, hasta: ymdFromUtc(now) };
  }
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return { desde: `${y}-${m}-01`, hasta: ymdFromUtc(now) };
}

export function parseDashboardSearchParams(
  raw: Record<string, string | string[] | undefined>,
):
  | { ok: true; data: DashboardQuery; range: { desde: string; hasta: string } }
  | { ok: false; data: DashboardQuery; range: { desde: string; hasta: string }; zodError: z.ZodError } {
  const p = (k: string) => {
    const v = raw[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const pre = {
    periodo: p("periodo"),
    desde: p("desde"),
    hasta: p("hasta"),
    cliente: p("cliente"),
    q: p("q"),
  };
  const parsed = dashboardQuerySchema.safeParse({
    periodo: pre.periodo && periodoValues.includes(pre.periodo as PeriodoPreset) ? pre.periodo : undefined,
    desde: pre.desde,
    hasta: pre.hasta,
    cliente: pre.cliente,
    q: pre.q,
  });
  if (!parsed.success) {
    const r = resolveDateRange("mes", undefined, undefined);
    const data: DashboardQuery = {
      periodo: "mes",
      desde: undefined,
      hasta: undefined,
      cliente: undefined,
      q: undefined,
    };
    return { ok: false, data, range: r, zodError: parsed.error };
  }
  const d = parsed.data;
  const r = resolveDateRange(
    d.periodo,
    d.desde && d.desde !== "" ? d.desde : undefined,
    d.hasta && d.hasta !== "" ? d.hasta : undefined,
  );
  return { ok: true, data: d, range: r };
}
