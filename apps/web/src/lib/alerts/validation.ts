import { z } from "zod";

import { parseInvoiceDateInput } from "@/lib/dates/ymd";

import {
  ALERT_SEVERITY_CRITICAL,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_LOW,
  ALERT_SEVERITY_MEDIUM,
  ALERT_TYPE_COLLECTION_NOT_DEPOSITED,
  ALERT_TYPE_INCONSISTENCY,
  ALERT_TYPE_INVOICE_OVERDUE,
} from "./constants";

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = parseInvoiceDateInput(s);
    return !Number.isNaN(d.getTime());
  });

const alertTypeFilter = z.enum([
  ALERT_TYPE_INVOICE_OVERDUE,
  ALERT_TYPE_COLLECTION_NOT_DEPOSITED,
  ALERT_TYPE_INCONSISTENCY,
  "all",
]);

const statusFilter = z.enum(["all", "open", "acknowledged", "closed"]);

const severityFilter = z.enum([
  "all",
  ALERT_SEVERITY_LOW,
  ALERT_SEVERITY_MEDIUM,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_CRITICAL,
]);

export const listAlertsQuerySchema = z
  .object({
    q: z.string().optional().transform((s) => s?.trim() || undefined),
    tipo: z.preprocess((v) => (v === "all" || v === "" ? "all" : v), alertTypeFilter.default("all")),
    estado: z.preprocess((v) => (v === "all" || v === "" ? "all" : v), statusFilter.default("all")),
    severidad: z.preprocess((v) => (v === "all" || v === "" ? "all" : v), severityFilter.default("all")),
    desde: z
      .preprocess((v) => (v === "" ? undefined : v), ymd.optional().or(z.undefined()))
      .optional(),
    hasta: z
      .preprocess((v) => (v === "" ? undefined : v), ymd.optional().or(z.undefined()))
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((d, ctx) => {
    if (d.desde && d.hasta) {
      const a = parseInvoiceDateInput(d.desde);
      const b = parseInvoiceDateInput(d.hasta);
      if (a.getTime() > b.getTime()) {
        ctx.addIssue({ code: "custom", path: ["desde"], message: "Rango de fechas inválido" });
      }
    }
  });

export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;

const entityField = z
  .string()
  .min(1, "Entidad requerida")
  .refine(
    (s) => s === "Sale" || s === "Collection" || s === "Reconciliation" || s === "ReconciliationDiscrepancy",
    "Entidad no válida",
  );

export const alertActionFormSchema = z.object({
  type: z.string().min(1),
  entityType: entityField,
  entityId: z.string().cuid("Id inválido"),
  severity: z.string().min(1).optional(),
  action: z.enum(["acknowledge", "close"]),
});

const defaultListQuery: ListAlertsQuery = {
  q: undefined,
  tipo: "all",
  estado: "all",
  severidad: "all",
  desde: undefined,
  hasta: undefined,
  page: 1,
  pageSize: 20,
};

export function parseListAlertsQuery(raw: Record<string, string | string[] | undefined>) {
  const p = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : raw[k]);
  const o = {
    q: p("q"),
    tipo: p("tipo") ?? p("type"),
    estado: p("estado"),
    severidad: p("severidad") ?? p("severity"),
    desde: p("desde"),
    hasta: p("hasta"),
    page: p("page"),
    pageSize: p("pageSize"),
  };
  const r = listAlertsQuerySchema.safeParse(o);
  if (r.success) {
    return { ok: true as const, data: r.data };
  }
  return { ok: false as const, data: defaultListQuery, error: r.error };
}
