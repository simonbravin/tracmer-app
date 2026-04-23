import "server-only";

import { Prisma, type CurrencyCode, ReconciliationStatus, SaleStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { collectionNetInCollectionCurrency, feeAmountInCollectionCurrency } from "@/lib/collections/amounts";
import { mapReconciledByCollection, pendingCollection } from "@/lib/reconciliations/balances";
import { mapDraftByCollection } from "@/lib/reconciliations/data";
import { parseInvoiceDateInput } from "@/lib/sales/data";
import { addCreditDays, isPastDue } from "@/lib/sales/format";

import type { DashboardQuery } from "./validation";

const TOL = new Prisma.Decimal("0.01");

const STATUS_FACTURADO: SaleStatus[] = [
  SaleStatus.issued,
  SaleStatus.partially_collected,
  SaleStatus.collected,
  SaleStatus.overdue,
];

function toBucket(cc: CurrencyCode) {
  return cc === "USD" ? "USD" as const : "ARS" as const;
}

function d0() {
  return new Prisma.Decimal(0);
}

function emptyBuckets(): Record<"ARS" | "USD", Prisma.Decimal> {
  return { ARS: d0(), USD: d0() };
}

function ymdToRange(ymdFrom: string, ymdTo: string) {
  const f: Prisma.DateTimeFilter = { gte: parseInvoiceDateInput(ymdFrom) };
  const end = parseInvoiceDateInput(ymdTo);
  end.setUTCDate(end.getUTCDate() + 1);
  f.lt = end;
  return f;
}

type DashboardFilters = {
  orgId: string;
  range: { desde: string; hasta: string };
  query: DashboardQuery;
};

function saleQWhere(
  q: string | undefined,
): Prisma.SaleWhereInput | null {
  const t = q?.trim();
  if (!t) return null;
  return {
    OR: [
      { invoiceNumber: { contains: t, mode: "insensitive" } },
      {
        client: {
          OR: [
            { displayName: { contains: t, mode: "insensitive" } },
            { legalName: { contains: t, mode: "insensitive" } },
          ],
        },
      },
    ],
  };
}

export type MoneyBuckets = { ARS: Prisma.Decimal; USD: Prisma.Decimal };

export type DashboardKpis = {
  facturado: MoneyBuckets;
  cobradoBruto: MoneyBuckets;
  cobradoNeto: MoneyBuckets;
  depositado: MoneyBuckets;
  pendienteCobrar: MoneyBuckets;
  pendienteDepositar: MoneyBuckets;
};

export type VencidaRow = {
  id: string;
  invoiceNumber: string | null;
  clientLabel: string;
  currencyCode: CurrencyCode;
  remaining: string;
  invoiceDate: string;
  dueLabel: string;
  href: string;
};

export type ColNoDepRow = {
  id: string;
  collectionDate: string;
  amount: string;
  currencyCode: CurrencyCode;
  pending: string;
  href: string;
};

export type ReconRow = {
  id: string;
  closedAt: string;
  lineCount: number;
  href: string;
  notes: string | null;
};

export type ClientRankRow = {
  clientId: string;
  name: string;
  amount: string;
  currencyCode: CurrencyCode;
};

/**
 * Carga de tablero: rango = facturas / cobranzas / depósitos (fecha documento), multi-tenant.
 * Filtro cliente: facturación y CxC (venta); cobranza agregada y bancos siguen siendo a nivel organización
 * (neto y depósito no se desglosan por cliente sin criterio contable adicional).
 */
export async function getDashboardData(f: DashboardFilters): Promise<{
  kpis: DashboardKpis;
  ventasVencidas: VencidaRow[];
  cobranzasNoDep: ColNoDepRow[];
  concRecientes: ReconRow[];
  topFacturacion: ClientRankRow[];
  topPendiente: ClientRankRow[];
}> {
  const { orgId, range, query: dq } = f;
  const inv = ymdToRange(range.desde, range.hasta);
  const colDt = ymdToRange(range.desde, range.hasta);
  const depDt = ymdToRange(range.desde, range.hasta);
  const closedRecon = ymdToRange(range.desde, range.hasta);

  const whereClient = dq.cliente ? { clientId: dq.cliente } : ({} as object);

  const whereSaleKpi: Prisma.SaleWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    status: { in: STATUS_FACTURADO },
    invoiceDate: inv,
    ...whereClient,
  };

  const [facturadoG, colRows, depG, recMap, draftMap] = await Promise.all([
    prisma.sale.groupBy({
      by: ["currencyCode"],
      where: whereSaleKpi,
      _sum: { totalAmount: true },
    }),
    prisma.collection.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        voidedAt: null,
        status: "valid" as const,
        collectionDate: colDt,
      },
      select: {
        id: true,
        grossAmount: true,
        currencyCode: true,
        fees: {
          where: { deletedAt: null },
          select: { amount: true, fxRateToCollectionCurrency: true },
        },
      },
    }),
    prisma.bankDeposit.groupBy({
      by: ["currencyCode"],
      where: { organizationId: orgId, deletedAt: null, depositDate: depDt },
      _sum: { amount: true },
    }),
    mapReconciledByCollection(orgId),
    mapDraftByCollection(orgId),
  ]);

  const facturado = emptyBuckets();
  for (const r of facturadoG) {
    const b = toBucket(r.currencyCode);
    facturado[b] = facturado[b].add(r._sum.totalAmount ?? d0());
  }

  const cobradoBruto = emptyBuckets();
  const cobradoNeto = emptyBuckets();
  for (const c of colRows) {
    const b = toBucket(c.currencyCode);
    const feeSum = c.fees.reduce((acc, fee) => {
      const inCol = feeAmountInCollectionCurrency(
        fee.amount,
        new Prisma.Decimal(fee.fxRateToCollectionCurrency),
      );
      return acc.add(inCol);
    }, d0());
    const net = collectionNetInCollectionCurrency(c.grossAmount, feeSum);
    cobradoBruto[b] = cobradoBruto[b].add(c.grossAmount);
    cobradoNeto[b] = cobradoNeto[b].add(net);
  }

  const depositado = emptyBuckets();
  for (const d of depG) {
    const b = toBucket(d.currencyCode);
    depositado[b] = depositado[b].add(d._sum.amount ?? d0());
  }

  const colsPend = await prisma.collection.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      voidedAt: null,
      status: "valid" as const,
      collectionDate: colDt,
    },
    select: { id: true, grossAmount: true, currencyCode: true },
  });
  const pendDep = emptyBuckets();
  for (const c of colsPend) {
    const rec = recMap.get(c.id) ?? d0();
    const dr = draftMap.get(c.id) ?? d0();
    const p = pendingCollection(c.grossAmount, rec).sub(dr);
    if (p.gt(TOL)) {
      const b = toBucket(c.currencyCode);
      pendDep[b] = pendDep[b].add(p);
    }
  }

  const wherePendingSale: Prisma.SaleWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    status: { in: [SaleStatus.issued, SaleStatus.partially_collected, SaleStatus.overdue] },
    invoiceDate: inv,
    ...whereClient,
  };
  const openSales = await prisma.sale.findMany({
    where: wherePendingSale,
    select: { id: true, totalAmount: true, currencyCode: true, status: true, clientId: true },
  });
  const openIds = openSales.map((s) => s.id);
  const allocSums = openIds.length
    ? await prisma.collectionAllocation.groupBy({
        by: ["saleId"],
        where: {
          organizationId: orgId,
          saleId: { in: openIds },
          deletedAt: null,
          collection: { voidedAt: null, status: "valid" as const, deletedAt: null },
        },
        _sum: { amountInSaleCurrency: true },
      })
    : [];
  const bySale = new Map(
    allocSums.map((a) => [a.saleId, a._sum.amountInSaleCurrency ?? d0()]),
  );
  const pendCob = emptyBuckets();
  for (const s of openSales) {
    const a = bySale.get(s.id) ?? d0();
    const rem = s.totalAmount.sub(a);
    if (rem.lte(TOL)) continue;
    const b = toBucket(s.currencyCode);
    pendCob[b] = pendCob[b].add(rem);
  }

  const vencQ = saleQWhere(dq.q);
  const vencBase: Prisma.SaleWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    status: { in: [SaleStatus.issued, SaleStatus.partially_collected, SaleStatus.overdue] },
    ...whereClient,
  };
  const vencQuery: Prisma.SaleWhereInput = vencQ ? { AND: [vencBase, vencQ] } : vencBase;
  const forVenc = await prisma.sale.findMany({
    where: vencQuery,
    take: 400,
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
  const vIds = forVenc.map((s) => s.id);
  const vAlloc = vIds.length
    ? await prisma.collectionAllocation.groupBy({
        by: ["saleId"],
        where: {
          organizationId: orgId,
          saleId: { in: vIds },
          deletedAt: null,
          collection: { voidedAt: null, status: "valid" as const, deletedAt: null },
        },
        _sum: { amountInSaleCurrency: true },
      })
    : [];
  const vMap = new Map(
    vAlloc.map((a) => [a.saleId, a._sum.amountInSaleCurrency ?? d0()]),
  );
  const ventasVencidasUnsorted: VencidaRow[] = [];
  for (const s of forVenc) {
    if (!isPastDue(s.invoiceDate, s.creditDays)) continue;
    const a = vMap.get(s.id) ?? d0();
    const rem = s.totalAmount.sub(a);
    if (rem.lte(TOL)) continue;
    const dueD = addCreditDays(s.invoiceDate, s.creditDays);
    const dueStr = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(dueD);
    const clientLabel = s.client?.displayName || s.client?.legalName || "(sin cliente)";
    ventasVencidasUnsorted.push({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      clientLabel,
      currencyCode: s.currencyCode,
      remaining: rem.toString(),
      invoiceDate: s.invoiceDate.toISOString().slice(0, 10),
      dueLabel: dueStr,
      href: `/operaciones/ventas/${s.id}`,
    });
  }
  const ventasVencidas = ventasVencidasUnsorted
    .sort(
      (u, v) => new Date(u.invoiceDate).getTime() - new Date(v.invoiceDate).getTime(),
    )
    .slice(0, 12);

  const colNoDebase = await prisma.collection.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      voidedAt: null,
      status: "valid" as const,
      collectionDate: colDt,
    },
    orderBy: { collectionDate: "desc" },
    take: 120,
    select: {
      id: true,
      grossAmount: true,
      currencyCode: true,
      collectionDate: true,
    },
  });
  const cobNoDepRows: ColNoDepRow[] = [];
  for (const c of colNoDebase) {
    const re = recMap.get(c.id) ?? d0();
    const dr = draftMap.get(c.id) ?? d0();
    const p = pendingCollection(c.grossAmount, re).sub(dr);
    if (p.lte(TOL)) continue;
    if (dq.q) {
      const t = dq.q.trim();
      if (!c.id.toLowerCase().includes(t.toLowerCase())) continue;
    }
    cobNoDepRows.push({
      id: c.id,
      collectionDate: c.collectionDate.toISOString().slice(0, 10),
      amount: c.grossAmount.toString(),
      currencyCode: c.currencyCode,
      pending: p.toString(),
      href: `/operaciones/cobranzas/${c.id}`,
    });
  }
  const cobranzasNoDep = cobNoDepRows.slice(0, 8);

  const recons = await prisma.reconciliation.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      status: ReconciliationStatus.closed,
      closedAt: closedRecon,
    },
    orderBy: { closedAt: "desc" },
    take: 10,
    select: {
      id: true,
      closedAt: true,
      notes: true,
      _count: { select: { lines: { where: { deletedAt: null } } } },
    },
  });
  const concRecientes: ReconRow[] = recons.map((r) => ({
    id: r.id,
    closedAt: r.closedAt
      ? new Date(r.closedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
      : "—",
    lineCount: r._count.lines,
    href: `/bancos/conciliaciones/${r.id}`,
    notes: r.notes,
  }));

  const gFact = await prisma.sale.groupBy({
    by: ["clientId", "currencyCode"],
    where: whereSaleKpi,
    _sum: { totalAmount: true },
  });
  const cIds = [...new Set(gFact.map((g) => g.clientId).filter((x): x is string => x != null))];
  const clMap = cIds.length
    ? await prisma.client.findMany({
        where: { id: { in: cIds }, organizationId: orgId },
        select: { id: true, displayName: true, legalName: true },
      })
    : [];
  const nameBy = new Map(clMap.map((c) => [c.id, c.displayName || c.legalName || c.id] as const));

  const topFArs = gFact
    .filter((g) => g.clientId && g.currencyCode === "ARS" && (g._sum.totalAmount?.gt(0) ?? false))
    .map((g) => ({
      clientId: g.clientId as string,
      amount: g._sum.totalAmount as Prisma.Decimal,
      currencyCode: "ARS" as const,
    }))
    .sort((a, b) => b.amount.cmp(a.amount));
  const topFUsd = gFact
    .filter((g) => g.clientId && g.currencyCode === "USD" && (g._sum.totalAmount?.gt(0) ?? false))
    .map((g) => ({
      clientId: g.clientId as string,
      amount: g._sum.totalAmount as Prisma.Decimal,
      currencyCode: "USD" as const,
    }))
    .sort((a, b) => b.amount.cmp(a.amount));

  const topFacturacion: ClientRankRow[] = [
    ...topFArs.slice(0, 5).map((g) => ({
      clientId: g.clientId,
      name: nameBy.get(g.clientId) ?? g.clientId,
      amount: g.amount.toString(),
      currencyCode: g.currencyCode,
    })),
    ...topFUsd.slice(0, 5).map((g) => ({
      clientId: g.clientId,
      name: nameBy.get(g.clientId) ?? g.clientId,
      amount: g.amount.toString(),
      currencyCode: g.currencyCode,
    })),
  ].slice(0, 8);

  const pendByClient = new Map<string, { ars: Prisma.Decimal; usd: Prisma.Decimal }>();
  for (const s of openSales) {
    if (!s.id) continue;
    const a = bySale.get(s.id) ?? d0();
    const rem = s.totalAmount.sub(a);
    if (rem.lte(TOL)) continue;
    const cid = s.clientId ?? null;
    if (!cid) continue;
    const e = pendByClient.get(cid) ?? { ars: d0(), usd: d0() };
    if (s.currencyCode === "USD") e.usd = e.usd.add(rem);
    else e.ars = e.ars.add(rem);
    pendByClient.set(cid, e);
  }
  const pendClients = await prisma.client.findMany({
    where: { id: { in: [...pendByClient.keys()] }, organizationId: orgId },
    select: { id: true, displayName: true, legalName: true },
  });
  const pName = new Map(
    pendClients.map((c) => [c.id, c.displayName || c.legalName || c.id] as const),
  );
  const pRows: { clientId: string; name: string; am: Prisma.Decimal; ccy: CurrencyCode }[] = [];
  for (const [id, b] of pendByClient) {
    if (b.ars.gt(TOL))
      pRows.push({ clientId: id, name: pName.get(id) ?? id, am: b.ars, ccy: "ARS" });
    if (b.usd.gt(TOL))
      pRows.push({ clientId: id, name: pName.get(id) ?? id, am: b.usd, ccy: "USD" });
  }
  pRows.sort((a, b) => b.am.cmp(a.am));
  const topPendiente: ClientRankRow[] = pRows.slice(0, 8).map((p) => ({
    clientId: p.clientId,
    name: p.name,
    amount: p.am.toString(),
    currencyCode: p.ccy,
  }));

  return {
    kpis: {
      facturado: { ARS: facturado.ARS, USD: facturado.USD },
      cobradoBruto: { ARS: cobradoBruto.ARS, USD: cobradoBruto.USD },
      cobradoNeto: { ARS: cobradoNeto.ARS, USD: cobradoNeto.USD },
      depositado: { ARS: depositado.ARS, USD: depositado.USD },
      pendienteCobrar: { ARS: pendCob.ARS, USD: pendCob.USD },
      pendienteDepositar: { ARS: pendDep.ARS, USD: pendDep.USD },
    },
    ventasVencidas,
    cobranzasNoDep,
    concRecientes,
    topFacturacion,
    topPendiente,
  };
}
