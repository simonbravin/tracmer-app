import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const transactionFeedQuerySchema = z.object({
  vista: z.enum(["efectivo", "operativo"]).default("efectivo"),
  desde: ymd.optional(),
  hasta: ymd.optional(),
  moneda: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["ARS", "USD"]).optional(),
  ),
  ubicacion: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().cuid().optional(),
  ),
  flujo: z.enum(["todos", "ingreso", "egreso", "interno"]).default("todos"),
  page: z.preprocess(
    (v) => (v === undefined || v === "" || v == null ? 1 : Number(v)),
    z.number().int().min(1),
  ),
  pageSize: z.preprocess(
    (v) => (v === undefined || v === "" || v == null ? 25 : Number(v)),
    z.number().int().min(10).max(100),
  ),
});

export type TransactionFeedQuery = z.infer<typeof transactionFeedQuerySchema>;

export const MAX_FEED_RANGE_DAYS = 366;

function singleParam(raw: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = raw[k];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export function parseTransactionFeedSearchParams(raw: Record<string, string | string[] | undefined>): TransactionFeedQuery {
  return transactionFeedQuerySchema.parse({
    vista: singleParam(raw, "vista"),
    desde: singleParam(raw, "desde"),
    hasta: singleParam(raw, "hasta"),
    moneda: singleParam(raw, "moneda"),
    ubicacion: singleParam(raw, "ubicacion"),
    flujo: singleParam(raw, "flujo"),
    page: singleParam(raw, "page"),
    pageSize: singleParam(raw, "pageSize"),
  });
}
