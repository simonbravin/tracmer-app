import { z } from "zod";

import { reportKeys } from "@/lib/reports/types";
import {
  clientesReportFilterSchema,
  cobranzasReportFilterSchema,
  conciliacionesReportFilterSchema,
  depositosReportFilterSchema,
  ventasReportFilterSchema,
} from "@/lib/reports/validation";

const reportKey = z.enum(reportKeys);

const emailStr = z
  .string()
  .min(1)
  .max(320)
  .email("Email inválido")
  .transform((e) => e.toLowerCase().trim());

const scheduleSpecSchema = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    /** "HH:mm" 24h en la zona del schedule */
    time: z.string().regex(/^\d{2}:\d{2}$/, "Hora: usar HH:mm (24h)"),
    /** 0=dom … 6=sáb; solo si frequency === weekly */
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    /** 1-28; solo si frequency === monthly */
    dayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.frequency === "weekly" && d.dayOfWeek == null) {
      ctx.addIssue({ code: "custom", message: "Elegí el día de la semana", path: ["dayOfWeek"] });
    }
    if (d.frequency === "monthly" && d.dayOfMonth == null) {
      ctx.addIssue({ code: "custom", message: "Elegí el día del mes (1-28)", path: ["dayOfMonth"] });
    }
  });

export const storedReportParametersSchema = z.discriminatedUnion("report", [
  z.object({
    report: z.literal("ventas"),
    format: z.enum(["xlsx", "pdf"]),
    filter: ventasReportFilterSchema,
  }),
  z.object({
    report: z.literal("cobranzas"),
    format: z.enum(["xlsx", "pdf"]),
    filter: cobranzasReportFilterSchema,
  }),
  z.object({
    report: z.literal("depositos"),
    format: z.enum(["xlsx", "pdf"]),
    filter: depositosReportFilterSchema,
  }),
  z.object({
    report: z.literal("conciliaciones"),
    format: z.enum(["xlsx", "pdf"]),
    filter: conciliacionesReportFilterSchema,
  }),
  z.object({
    report: z.literal("clientes"),
    format: z.enum(["xlsx", "pdf"]),
    filter: clientesReportFilterSchema,
  }),
]);

export type StoredReportParameters = z.infer<typeof storedReportParametersSchema>;

const createScheduleFormObjectSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  reportType: reportKey,
  timezone: z.string().min(1).max(100),
  isActive: z.coerce.boolean().default(true),
  parameters: storedReportParametersSchema,
  schedule: scheduleSpecSchema,
  recipientEmails: z
    .array(emailStr)
    .min(1, "Al menos un email")
    .max(20, "Máximo 20 destinatarios"),
});

function refineReportTypeMatchesParameters(
  d: { reportType: z.infer<typeof reportKey>; parameters: z.infer<typeof storedReportParametersSchema> },
  ctx: z.RefinementCtx,
) {
  if (d.reportType !== d.parameters.report) {
    ctx.addIssue({ code: "custom", message: "El tipo de reporte y los parámetros no coinciden", path: ["reportType"] });
  }
}

export const createScheduleFormSchema = createScheduleFormObjectSchema.superRefine(refineReportTypeMatchesParameters);

export type CreateScheduleForm = z.infer<typeof createScheduleFormSchema>;

export const updateScheduleFormSchema = createScheduleFormObjectSchema
  .extend({ scheduleId: z.string().min(1) })
  .superRefine(refineReportTypeMatchesParameters);

export type UpdateScheduleForm = z.infer<typeof updateScheduleFormSchema>;

/** `parametersOverride` en DB: spec de programación + posible ampliación futura */
export const parametersOverrideSchema = z.object({
  schedule: scheduleSpecSchema,
});

export type ParametersOverride = z.infer<typeof parametersOverrideSchema>;

/**
 * Construye la expresión cron (5 campos) a partir del spec. Se guarda en `ReportSchedule.cronExpression`.
 * Notación: minuto hora dom mes dow (dow: 0=dom en cron estándar).
 */
export function buildCronFromSpec(spec: z.infer<typeof scheduleSpecSchema>): string {
  const [h, m] = spec.time.split(":").map((x) => parseInt(x, 10));
  const min = m;
  const hour = h;
  if (spec.frequency === "daily") {
    return `${min} ${hour} * * *`;
  }
  if (spec.frequency === "weekly") {
    const dow = spec.dayOfWeek ?? 0; // 0=dom … 6=sáb (igual que cron 0-6)
    return `${min} ${hour} * * ${dow}`;
  }
  // monthly
  const dom = spec.dayOfMonth ?? 1;
  return `${min} ${hour} ${dom} * *`;
}
