import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { parseInvoiceDateInput } from "@/lib/sales/data";

export type DashboardDailyPoint = {
  date: string;
  facturado: number;
  cobrado: number;
  depositado: number;
};

function eachIsoDayInclusive(desde: string, hasta: string): string[] {
  const start = parseInvoiceDateInput(desde);
  const end = parseInvoiceDateInput(hasta);
  const out: string[] = [];
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard++ < 400) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function rowTotal(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Serie diaria en ARS (facturado / cobrado bruto / depositado) para gráficos.
 * Cobranza y depósito a nivel organización; facturado respeta `clientId` si se pasa.
 */
export async function getDashboardDailySeriesArs(input: {
  orgId: string;
  range: { desde: string; hasta: string };
  clientId?: string | null;
}): Promise<DashboardDailyPoint[]> {
  const { orgId, range, clientId } = input;
  const days = eachIsoDayInclusive(range.desde, range.hasta);
  if (days.length === 0) return [];

  const saleRows = clientId
    ? await prisma.$queryRaw<{ day: string; total: unknown }[]>(Prisma.sql`
        SELECT s.invoice_date::text AS day, COALESCE(SUM(s.total_amount), 0) AS total
        FROM sales s
        WHERE s.organization_id = ${orgId}
          AND s.deleted_at IS NULL
          AND s.status IN ('issued', 'partially_collected', 'collected', 'overdue')
          AND s.currency_code = 'ARS'
          AND s.invoice_date >= ${range.desde}::date
          AND s.invoice_date <= ${range.hasta}::date
          AND s.client_id = ${clientId}
        GROUP BY s.invoice_date
        ORDER BY s.invoice_date
      `)
    : await prisma.$queryRaw<{ day: string; total: unknown }[]>(Prisma.sql`
        SELECT s.invoice_date::text AS day, COALESCE(SUM(s.total_amount), 0) AS total
        FROM sales s
        WHERE s.organization_id = ${orgId}
          AND s.deleted_at IS NULL
          AND s.status IN ('issued', 'partially_collected', 'collected', 'overdue')
          AND s.currency_code = 'ARS'
          AND s.invoice_date >= ${range.desde}::date
          AND s.invoice_date <= ${range.hasta}::date
        GROUP BY s.invoice_date
        ORDER BY s.invoice_date
      `);

  const colRows = await prisma.$queryRaw<{ day: string; total: unknown }[]>(Prisma.sql`
      SELECT c.collection_date::text AS day, COALESCE(SUM(c.gross_amount), 0) AS total
      FROM collections c
      WHERE c.organization_id = ${orgId}
        AND c.deleted_at IS NULL
        AND c.voided_at IS NULL
        AND c.status = 'valid'
        AND c.currency_code = 'ARS'
        AND c.collection_date >= ${range.desde}::date
        AND c.collection_date <= ${range.hasta}::date
      GROUP BY c.collection_date
      ORDER BY c.collection_date
    `);

  const depRows = await prisma.$queryRaw<{ day: string; total: unknown }[]>(Prisma.sql`
      SELECT d.deposit_date::text AS day, COALESCE(SUM(d.amount), 0) AS total
      FROM bank_deposits d
      WHERE d.organization_id = ${orgId}
        AND d.deleted_at IS NULL
        AND d.currency_code = 'ARS'
        AND d.deposit_date >= ${range.desde}::date
        AND d.deposit_date <= ${range.hasta}::date
      GROUP BY d.deposit_date
      ORDER BY d.deposit_date
    `);

  const fact = new Map(saleRows.map((r) => [r.day, rowTotal(r.total)]));
  const cob = new Map(colRows.map((r) => [r.day, rowTotal(r.total)]));
  const dep = new Map(depRows.map((r) => [r.day, rowTotal(r.total)]));

  return days.map((date) => ({
    date,
    facturado: fact.get(date) ?? 0,
    cobrado: cob.get(date) ?? 0,
    depositado: dep.get(date) ?? 0,
  }));
}
