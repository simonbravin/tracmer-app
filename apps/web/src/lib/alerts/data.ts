import "server-only";

import { AlertStatus, Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { TOLERANCE } from "@/lib/collections/constants";
import { checkAllocationsVsGross } from "@/lib/collections/amounts";
import { listAvailableCollections } from "@/lib/reconciliations/data";
import { sumAllocatedToSale } from "@/lib/collections/recompute";
import { parseInvoiceDateInput } from "@/lib/sales/data";
import { addCreditDays, isPastDue } from "@/lib/sales/format";
import { labelDiscrepancyCategory } from "@/lib/reconciliations/discrepancy-categories";

import {
  ALERT_SEVERITY_CRITICAL,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_MEDIUM,
  ALERT_TYPE_COLLECTION_NOT_DEPOSITED,
  ALERT_TYPE_INCONSISTENCY,
  ALERT_TYPE_INVOICE_OVERDUE,
  ENTITY_COLLECTION,
  ENTITY_RECONCILIATION_DISCREPANCY,
  ENTITY_SALE,
  STALE_PENDING_COLLECTION_DAYS,
} from "./constants";
import type { ListAlertsQuery } from "./validation";

export type AlertListRow = {
  key: string;
  /** Fila puramente derivada, sin registro aún en `alerts` */
  derived: boolean;
  dbId: string | null;
  type: string;
  severity: string;
  status: AlertStatus;
  title: string;
  detail: string;
  href: string;
  sortAt: Date;
  createdAt: Date;
  entityType: string;
  entityId: string;
};

type StoredMap = Map<string, { id: string; status: AlertStatus; acknowledgedAt: Date | null; closedAt: Date | null }>;

const d0 = () => new Prisma.Decimal(0);

function keyOf(type: string, entityType: string, entityId: string) {
  return `${type}::${entityType}::${entityId}`;
}

function dateInRange(d: Date, desde?: string, hasta?: string): boolean {
  const t = d.getTime();
  if (desde) {
    const a = parseInvoiceDateInput(desde);
    a.setUTCHours(0, 0, 0, 0);
    if (t < a.getTime()) return false;
  }
  if (hasta) {
    const b = parseInvoiceDateInput(hasta);
    b.setUTCHours(0, 0, 0, 0);
    b.setUTCDate(b.getUTCDate() + 1);
    if (t >= b.getTime()) return false;
  }
  return true;
}

function calendarDaysBetween(from: Date, to = new Date()): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(0, Math.round((b - a) / (24 * 3600 * 1000)));
}

type Aggregates = {
  latestByKey: StoredMap;
  firstCreated: Map<string, Date>;
};

async function loadAlertAggregates(organizationId: string): Promise<Aggregates> {
  const rows = await prisma.alert.findMany({
    where: { organizationId },
    select: {
      id: true,
      type: true,
      entityType: true,
      entityId: true,
      status: true,
      acknowledgedAt: true,
      closedAt: true,
      createdAt: true,
    },
  });
  const latest = new Map<string, (typeof rows)[0]>();
  const firstCreated = new Map<string, Date>();
  for (const r of rows) {
    const k = keyOf(r.type, r.entityType, r.entityId);
    const ex = latest.get(k);
    if (!ex || r.createdAt > ex.createdAt) {
      latest.set(k, r);
    }
    const f = firstCreated.get(k);
    if (f == null || r.createdAt < f) {
      firstCreated.set(k, r.createdAt);
    }
  }
  const latestByKey: StoredMap = new Map();
  for (const [k, r] of latest) {
    latestByKey.set(k, { id: r.id, status: r.status, acknowledgedAt: r.acknowledgedAt, closedAt: r.closedAt });
  }
  return { latestByKey, firstCreated };
}

export async function buildActiveComputedAlerts(organizationId: string): Promise<Omit<AlertListRow, "key" | "dbId" | "status" | "createdAt" | "derived">[]> {
  const out: Omit<AlertListRow, "key" | "dbId" | "status" | "createdAt" | "derived">[] = [];

  const sales = await prisma.sale.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { in: [SaleStatus.issued, SaleStatus.partially_collected, SaleStatus.overdue] },
    },
    take: 500,
    orderBy: { invoiceDate: "asc" },
    select: {
      id: true,
      invoiceDate: true,
      creditDays: true,
      totalAmount: true,
      currencyCode: true,
      invoiceNumber: true,
      client: { select: { displayName: true, legalName: true } },
    },
  });

  for (const s of sales) {
    if (!isPastDue(s.invoiceDate, s.creditDays)) continue;
    const collected = await sumAllocatedToSale(organizationId, s.id);
    if (s.totalAmount.sub(collected).lte(TOLERANCE)) continue;
    const due = addCreditDays(s.invoiceDate, s.creditDays);
    const cl = s.client?.displayName || s.client?.legalName || "Sin cliente";
    out.push({
      type: ALERT_TYPE_INVOICE_OVERDUE,
      severity: ALERT_SEVERITY_HIGH,
      title: "Factura vencida con saldo pendiente",
      detail: `${s.invoiceNumber ? `Nº ${s.invoiceNumber} · ` : ""}${cl} — vence ${new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(due)}`,
      href: `/operaciones/ventas/${s.id}`,
      sortAt: due,
      entityType: ENTITY_SALE,
      entityId: s.id,
    });
  }

  const colsPending = await listAvailableCollections(organizationId);
  for (const c of colsPending) {
    const age = calendarDaysBetween(c.collectionDate);
    if (age < STALE_PENDING_COLLECTION_DAYS) continue;
    out.push({
      type: ALERT_TYPE_COLLECTION_NOT_DEPOSITED,
      severity: ALERT_SEVERITY_MEDIUM,
      title: "Cobranza con saldo aún no conciliado a depósito (antigüedad elevada)",
      detail: `Fecha cobranza ${c.collectionDate.toISOString().slice(0, 10)} (hace ${age} días) — pendiente ${c.pending.toString()} ${c.currencyCode}`,
      href: `/operaciones/cobranzas/${c.id}`,
      sortAt: c.collectionDate,
      entityType: ENTITY_COLLECTION,
      entityId: c.id,
    });
  }

  const withAlloc = await prisma.collection.findMany({
    where: { organizationId, deletedAt: null, voidedAt: null, status: "valid" as const },
    take: 120,
    orderBy: { collectionDate: "desc" },
    include: {
      allocations: { where: { deletedAt: null } },
    },
  });

  for (const c of withAlloc) {
    const sumCol = c.allocations.reduce(
      (acc, a) => acc.add(new Prisma.Decimal(a.amountInCollectionCurrency)),
      d0(),
    );
    const { ok, overflow } = checkAllocationsVsGross(c.grossAmount, sumCol);
    if (ok) continue;
    if (overflow.lte(TOLERANCE)) continue;
    out.push({
      type: ALERT_TYPE_INCONSISTENCY,
      severity: ALERT_SEVERITY_CRITICAL,
      title: "Cobranza: imputaciones exceden el bruto",
      detail: `Cobranza ${c.id.slice(0, 8)}… — excedente ${overflow.toString()} (regla de tolerancia en cobranzas)`,
      href: `/operaciones/cobranzas/${c.id}`,
      sortAt: c.collectionDate,
      entityType: ENTITY_COLLECTION,
      entityId: c.id,
    });
  }

  const discs = await prisma.reconciliationDiscrepancy.findMany({
    where: { organizationId, reconciliation: { organizationId, deletedAt: null, status: "closed" as const } },
    take: 80,
    orderBy: { createdAt: "desc" },
    include: { reconciliation: { select: { id: true, closedAt: true } } },
  });

  for (const d of discs) {
    if (d.amount.lte(0)) continue;
    const cat = labelDiscrepancyCategory(d.categoryCode);
    out.push({
      type: ALERT_TYPE_INCONSISTENCY,
      severity: ALERT_SEVERITY_HIGH,
      title: "Conciliación cerrada: discrepancia documentada",
      detail: `${cat} — ${d.amount.toString()} ${d.currencyCode}${d.notes ? ` · ${d.notes}` : ""}`,
      href: `/bancos/conciliaciones/${d.reconciliationId}`,
      sortAt: d.reconciliation.closedAt ?? d.createdAt,
      entityType: ENTITY_RECONCILIATION_DISCREPANCY,
      entityId: d.id,
    });
  }

  return out;
}

/**
 * Fila de alerta “solo BD” (estado reconocida/cerrada) sin condición de cómputo,
 * p. ej. cierre de una alerta derivada que aún se lista en cierre.
 */
async function rowsFromClosedDb(organizationId: string, q: ListAlertsQuery): Promise<AlertListRow[]> {
  const andFilters: Prisma.AlertWhereInput[] = [
    { organizationId, status: AlertStatus.closed, closedAt: { not: null } },
  ];
  if (q.desde || q.hasta) {
    const f: Prisma.DateTimeFilter = {};
    if (q.desde) f.gte = parseInvoiceDateInput(q.desde);
    if (q.hasta) {
      const e = parseInvoiceDateInput(q.hasta);
      e.setUTCDate(e.getUTCDate() + 1);
      f.lt = e;
    }
    andFilters.push({ OR: [{ createdAt: f }, { closedAt: f }] });
  }
  if (q.tipo && q.tipo !== "all") {
    andFilters.push({ type: q.tipo });
  }
  if (q.severidad && q.severidad !== "all") {
    andFilters.push({ severity: q.severidad });
  }
  const tq = q.q?.trim();
  if (tq) {
    andFilters.push({
      OR: [
        { type: { contains: tq, mode: "insensitive" } },
        { entityId: { contains: tq, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.AlertWhereInput = { AND: andFilters };

  const closedRows = await prisma.alert.findMany({
    where,
    orderBy: { closedAt: "desc" },
    take: 500,
    select: {
      id: true,
      type: true,
      severity: true,
      status: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      closedAt: true,
      payload: true,
    },
  });

  return closedRows.map((a) => {
    const p = a.payload as { title?: string; detail?: string; href?: string } | null;
    return {
      key: keyOf(a.type, a.entityType, a.entityId),
      derived: false,
      dbId: a.id,
      type: a.type,
      severity: a.severity,
      status: a.status,
      title: p?.title ?? a.type,
      detail: p?.detail ?? "Cerrada manualmente.",
      href: p?.href ?? "#",
      sortAt: a.closedAt ?? a.createdAt,
      createdAt: a.createdAt,
      entityType: a.entityType,
      entityId: a.entityId,
    };
  });
}

export async function listMergedAlerts(organizationId: string, q: ListAlertsQuery): Promise<{
  items: AlertListRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { latestByKey: stored, firstCreated } = await loadAlertAggregates(organizationId);
  if (q.estado === "closed") {
    const all = await rowsFromClosedDb(organizationId, q);
    const total = all.length;
    const { page, pageSize } = q;
    return {
      items: all.slice((page - 1) * pageSize, page * pageSize),
      total,
      page,
      pageSize,
    };
  }

  const computed = await buildActiveComputedAlerts(organizationId);
  const rows: AlertListRow[] = [];
  for (const c of computed) {
    const k = keyOf(c.type, c.entityType, c.entityId);
    const st = stored.get(k);
    if (st?.status === "closed") continue;
    if (!dateInRange(c.sortAt, q.desde, q.hasta)) continue;
    if (q.tipo && q.tipo !== "all" && c.type !== q.tipo) continue;
    if (q.severidad && q.severidad !== "all" && c.severity !== q.severidad) continue;
    if (q.q?.trim()) {
      const t = q.q.toLowerCase();
      const j = (c.title + c.detail + c.entityId + c.type).toLowerCase();
      if (!j.includes(t)) continue;
    }
    const status: AlertStatus = st?.status ?? "open";
    if (q.estado === "open" && status !== "open") continue;
    if (q.estado === "acknowledged" && status !== "acknowledged") continue;
    if (q.estado === "all" && (status as string) === "closed") continue;
    const created = st ? (firstCreated.get(k) ?? c.sortAt) : c.sortAt;
    rows.push({
      key: k,
      derived: !st,
      dbId: st?.id ?? null,
      type: c.type,
      severity: c.severity,
      status,
      title: c.title,
      detail: c.detail,
      href: c.href,
      sortAt: c.sortAt,
      createdAt: created,
      entityType: c.entityType,
      entityId: c.entityId,
    });
  }
  rows.sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime());
  const total = rows.length;
  const { page, pageSize } = q;
  return {
    items: rows.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
  };
}

export type AlertSnapshot = { title: string; detail: string; href: string; severity: string };

/**
 * Texto y enlace para persistir al reconocer/cerrar una alerta derivada.
 */
export async function resolveAlertSnapshot(
  organizationId: string,
  type: string,
  entityType: string,
  entityId: string,
): Promise<AlertSnapshot | null> {
  if (entityType === ENTITY_SALE && type === ALERT_TYPE_INVOICE_OVERDUE) {
    const s = await prisma.sale.findFirst({
      where: { id: entityId, organizationId, deletedAt: null },
      include: { client: { select: { displayName: true, legalName: true } } },
    });
    if (!s) return null;
    const due = addCreditDays(s.invoiceDate, s.creditDays);
    const cl = s.client?.displayName || s.client?.legalName || "Sin cliente";
    return {
      severity: ALERT_SEVERITY_HIGH,
      title: "Factura vencida con saldo pendiente",
      detail: `${s.invoiceNumber ? `Nº ${s.invoiceNumber} · ` : ""}${cl} — vence ${new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(due)}`,
      href: `/operaciones/ventas/${s.id}`,
    };
  }
  if (entityType === ENTITY_COLLECTION) {
    const c = await prisma.collection.findFirst({
      where: { id: entityId, organizationId, deletedAt: null, voidedAt: null, status: "valid" },
    });
    if (!c) return null;
    if (type === ALERT_TYPE_COLLECTION_NOT_DEPOSITED) {
      return {
        severity: ALERT_SEVERITY_MEDIUM,
        title: "Cobranza pendiente de conciliar a depósito",
        detail: `Cobranza ${c.collectionDate.toISOString().slice(0, 10)}`,
        href: `/operaciones/cobranzas/${c.id}`,
      };
    }
    if (type === ALERT_TYPE_INCONSISTENCY) {
      return {
        severity: ALERT_SEVERITY_CRITICAL,
        title: "Inconsistencia en cobranza",
        detail: `Cobranza ${c.id.slice(0, 8)}…`,
        href: `/operaciones/cobranzas/${c.id}`,
      };
    }
  }
  if (entityType === ENTITY_RECONCILIATION_DISCREPANCY && type === ALERT_TYPE_INCONSISTENCY) {
    const d = await prisma.reconciliationDiscrepancy.findFirst({
      where: { id: entityId, organizationId },
      include: { reconciliation: { select: { id: true } } },
    });
    if (!d) return null;
    return {
      severity: ALERT_SEVERITY_HIGH,
      title: "Discrepancia en conciliación",
      detail: `${d.amount.toString()} ${d.currencyCode}`,
      href: `/bancos/conciliaciones/${d.reconciliationId}`,
    };
  }
  return null;
}

/** Conjunto mínimo para resumen (tablero): cantidad aprox. de filas abiertas no cerradas. */
export async function countOpenActiveHighSeverity(organizationId: string): Promise<{ count: number }> {
  const [agg, computed] = await Promise.all([loadAlertAggregates(organizationId), buildActiveComputedAlerts(organizationId)]);
  const stored = agg.latestByKey;
  let c = 0;
  for (const x of computed) {
    const st = stored.get(keyOf(x.type, x.entityType, x.entityId));
    if (st?.status === "closed") continue;
    if (x.severity === ALERT_SEVERITY_CRITICAL || x.severity === ALERT_SEVERITY_HIGH) {
      c += 1;
    }
  }
  return { count: c };
}
