import "server-only";

import { Prisma, type SaleStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { collectionNetInCollectionCurrency, feeAmountInCollectionCurrency } from "@/lib/collections/amounts";
import { labelDiscrepancyCategory } from "@/lib/reconciliations/discrepancy-categories";
import { labelSaleStatus } from "@/lib/sales/status";
import { parseCollectionDateInput } from "@/lib/collections/data";
import { parseInvoiceDateInput } from "@/lib/sales/data";
import { parseBankDate } from "@/lib/banks/data";

import type { z } from "zod";

import {
  type ExportRequest,
  clientesReportFilterSchema,
  cobranzasReportFilterSchema,
  conciliacionesReportFilterSchema,
  depositosReportFilterSchema,
  ventasReportFilterSchema,
} from "./validation";

function parseYmdLocal(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(ymd);
  }
  return new Date(`${ymd}T12:00:00.000Z`);
}

const MAX_ROWS = 10_000;
const d0 = () => new Prisma.Decimal(0);

function ymdToRange(ymdFrom: string, ymdTo: string) {
  const t = parseInvoiceDateInput(ymdTo);
  t.setUTCDate(t.getUTCDate() + 1);
  return { gte: parseInvoiceDateInput(ymdFrom), lt: t };
}

export type ReportTable = {
  title: string;
  headers: string[];
  rows: string[][];
  truncated: boolean;
};

type VentasF = z.infer<typeof ventasReportFilterSchema>;
type CobF = z.infer<typeof cobranzasReportFilterSchema>;
type DepF = z.infer<typeof depositosReportFilterSchema>;
type ConF = z.infer<typeof conciliacionesReportFilterSchema>;
type ClF = z.infer<typeof clientesReportFilterSchema>;

function invRange(desde: string, hasta: string) {
  const r = ymdToRange(desde, hasta);
  return { gte: r.gte, lt: r.lt };
}

export async function buildVentasTable(
  organizationId: string,
  f: VentasF,
  options?: { limit?: number },
): Promise<ReportTable> {
  const limit = Math.min(options?.limit ?? MAX_ROWS, MAX_ROWS);
  const where: Prisma.SaleWhereInput = { organizationId };
  if (f.visibilidad === "activas") where.deletedAt = null;
  if (f.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (f.clientId) where.clientId = f.clientId;
  if (f.estado) where.status = f.estado;
  if (f.moneda) where.currencyCode = f.moneda;
  const dr = invRange(f.desde, f.hasta);
  where.invoiceDate = { gte: dr.gte, lt: dr.lt };
  const total = await prisma.sale.count({ where });
  const items = await prisma.sale.findMany({
    where,
    orderBy: { invoiceDate: "desc" },
    take: limit,
    select: {
      id: true,
      invoiceDate: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
      currencyCode: true,
      amountArsEquivalentAtIssue: true,
      client: { select: { displayName: true, legalName: true } },
    },
  });
  const headers = [
    "Fecha factura",
    "N° factura",
    "Estado",
    "Cliente",
    "Moneda",
    "Total",
    "Equiv. ARS",
    "Id",
  ];
  const rows: string[][] = items.map((s) => [
    s.invoiceDate.toISOString().slice(0, 10),
    s.invoiceNumber ?? "",
    labelSaleStatus(s.status as SaleStatus),
    s.client?.displayName || s.client?.legalName || "",
    s.currencyCode,
    s.totalAmount.toString(),
    s.amountArsEquivalentAtIssue?.toString() ?? "",
    s.id,
  ]);
  return {
    title: "Ventas",
    headers,
    rows,
    truncated: total > items.length,
  };
}

export async function buildCobranzasTable(organizationId: string, f: CobF, options?: { limit?: number }): Promise<ReportTable> {
  const limit = Math.min(options?.limit ?? MAX_ROWS, MAX_ROWS);
  const where: Prisma.CollectionWhereInput = { organizationId };
  if (f.visibilidad === "activas") where.deletedAt = null;
  if (f.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (f.moneda) where.currencyCode = f.moneda;
  const dr: Prisma.DateTimeFilter = { gte: parseCollectionDateInput(f.desde) };
  const end = parseCollectionDateInput(f.hasta);
  end.setUTCDate(end.getUTCDate() + 1);
  dr.lt = end;
  where.collectionDate = dr;
  if (f.clientId) {
    where.allocations = { some: { deletedAt: null, sale: { clientId: f.clientId } } };
  }
  const total = await prisma.collection.count({ where });
  const items = await prisma.collection.findMany({
    where,
    take: limit,
    orderBy: { collectionDate: "desc" },
    include: {
      fees: { where: { deletedAt: null } },
      allocations: { where: { deletedAt: null } },
    },
  });
  const headers = [
    "Fecha cobro",
    "Id",
    "Moneda",
    "Bruto",
    "Suma gastos (mon. cobr.)",
    "Neto",
    "Líneas imputación",
    "Suma imput. (mon. cobr.)",
  ];
  const rows: string[][] = items.map((c) => {
    const feeSum = c.fees.reduce(
      (acc, fee) =>
        acc.add(feeAmountInCollectionCurrency(fee.amount, new Prisma.Decimal(fee.fxRateToCollectionCurrency))),
      d0(),
    );
    const net = collectionNetInCollectionCurrency(c.grossAmount, feeSum);
    const sumAl = c.allocations.reduce(
      (acc, a) => acc.add(new Prisma.Decimal(a.amountInCollectionCurrency)),
      d0(),
    );
    return [
      c.collectionDate.toISOString().slice(0, 10),
      c.id,
      c.currencyCode,
      c.grossAmount.toString(),
      feeSum.toString(),
      net.toString(),
      String(c.allocations.length),
      sumAl.toString(),
    ];
  });
  return { title: "Cobranzas", headers, rows, truncated: total > items.length };
}

export async function buildDepositosTable(organizationId: string, f: DepF, options?: { limit?: number }): Promise<ReportTable> {
  const limit = Math.min(options?.limit ?? MAX_ROWS, MAX_ROWS);
  const where: Prisma.BankDepositWhereInput = { organizationId };
  if (f.visibilidad === "activas") where.deletedAt = null;
  if (f.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (f.moneda) where.currencyCode = f.moneda;
  if (f.bankAccountId) where.bankAccountId = f.bankAccountId;
  const d2: Prisma.DateTimeFilter = { gte: parseBankDate(f.desde) };
  const e = parseBankDate(f.hasta);
  e.setUTCDate(e.getUTCDate() + 1);
  d2.lt = e;
  where.depositDate = d2;
  const total = await prisma.bankDeposit.count({ where });
  const items = await prisma.bankDeposit.findMany({
    where,
    orderBy: { depositDate: "desc" },
    take: limit,
    select: {
      id: true,
      depositDate: true,
      amount: true,
      currencyCode: true,
      reference: true,
      amountArsEquivalent: true,
      bankAccount: { select: { name: true, bankName: true, currencyCode: true } },
    },
  });
  const headers = ["Fecha dep.", "Cuenta", "Banco", "Moneda", "Monto", "Equiv. ARS", "Referencia", "Id dep."];
  const rows: string[][] = items.map((d) => [
    d.depositDate.toISOString().slice(0, 10),
    d.bankAccount.name,
    d.bankAccount.bankName,
    d.currencyCode,
    d.amount.toString(),
    d.amountArsEquivalent?.toString() ?? "",
    d.reference ?? "",
    d.id,
  ]);
  return { title: "Depósitos bancarios", headers, rows, truncated: total > items.length };
}

export async function buildConciliacionesTable(organizationId: string, f: ConF, options?: { limit?: number }): Promise<ReportTable> {
  const limit = Math.min(options?.limit ?? MAX_ROWS, MAX_ROWS);
  const where: Prisma.ReconciliationWhereInput = { organizationId };
  if (f.visibilidad === "activas") where.deletedAt = null;
  if (f.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (f.status) where.status = f.status;
  if (f.porFecha === "closed") {
    const t: Prisma.DateTimeFilter = { gte: parseYmdLocal(f.desde) };
    const b = parseYmdLocal(f.hasta);
    b.setUTCDate(b.getUTCDate() + 1);
    t.lt = b;
    where.OR = [
      { closedAt: t },
      { status: "draft" as const, createdAt: t, closedAt: null },
    ];
  } else {
    const t: Prisma.DateTimeFilter = { gte: parseYmdLocal(f.desde) };
    const b = parseYmdLocal(f.hasta);
    b.setUTCDate(b.getUTCDate() + 1);
    t.lt = b;
    where.createdAt = t;
  }
  const recons = await prisma.reconciliation.findMany({
    where,
    take: 500,
    orderBy: f.porFecha === "closed" ? { closedAt: "desc" } : { createdAt: "desc" },
    include: {
      lines: {
        where: { deletedAt: null },
        include: {
          collection: { select: { id: true, collectionDate: true, grossAmount: true, currencyCode: true } },
          bankDeposit: {
            select: {
              id: true,
              amount: true,
              currencyCode: true,
              depositDate: true,
              bankAccount: { select: { name: true } },
            },
          },
        },
      },
      discrepancies: { orderBy: { createdAt: "asc" } },
    },
  });
  const headers = [
    "Id concil.",
    "Estado",
    "Creada",
    "Cerrada",
    "Tipo fila",
    "Cobranza id / ref.",
    "Depósito id / ref.",
    "Aplic. desde cobr.",
    "Aplic. a dep.",
    "Categoría dif. / nota",
    "Monto dif.",
    "Mon. dif.",
  ];
  const rows: string[][] = [];
  for (const r of recons) {
    for (const ln of r.lines) {
      if (rows.length >= limit) break;
      const col = ln.collection;
      const dep = ln.bankDeposit;
      rows.push([
        r.id,
        r.status,
        r.createdAt.toISOString().slice(0, 10),
        r.closedAt ? r.closedAt.toISOString().slice(0, 10) : "",
        "Línea",
        col
          ? `${col.id} (${col.collectionDate.toISOString().slice(0, 10)}) ${col.grossAmount} ${col.currencyCode}`
          : ln.collectionId,
        dep
          ? `${dep.id} · ${dep.bankAccount.name} ${dep.depositDate.toISOString().slice(0, 10)} ${dep.amount} ${dep.currencyCode}`
          : ln.bankDepositId,
        ln.amountAppliedFromCollection.toString(),
        ln.amountAppliedToDeposit.toString(),
        "",
        "",
        "",
      ]);
    }
    for (const d of r.discrepancies) {
      if (rows.length >= limit) break;
      rows.push([
        r.id,
        r.status,
        r.createdAt.toISOString().slice(0, 10),
        r.closedAt ? r.closedAt.toISOString().slice(0, 10) : "",
        "Diferencia",
        "",
        "",
        "",
        "",
        `${labelDiscrepancyCategory(d.categoryCode)}${d.notes ? " · " + d.notes : ""}`,
        d.amount.toString(),
        d.currencyCode,
      ]);
    }
  }
  if (recons.length >= 500) {
    // posible corte: si hay >500 recons, advertir
  }
  return { title: "Conciliaciones", headers, rows, truncated: recons.length >= 500 || rows.length >= limit };
}

export async function buildClientesTable(organizationId: string, f: ClF, options?: { limit?: number }): Promise<ReportTable> {
  const limit = Math.min(options?.limit ?? MAX_ROWS, MAX_ROWS);
  const where: Prisma.ClientWhereInput = { organizationId, deletedAt: null };
  const t = f.q?.trim();
  if (t) {
    where.OR = [
      { displayName: { contains: t, mode: "insensitive" } },
      { legalName: { contains: t, mode: "insensitive" } },
      { taxId: { contains: t, mode: "insensitive" } },
    ];
  }
  const totalClients = await prisma.client.count({ where });
  const base = await prisma.client.findMany({
    where,
    take: 2000,
    orderBy: { displayName: "asc" },
    include: { contacts: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
  });
  const headers = ["Cliente (nombre)", "Razón social", "CUIT/CUIL", "Contacto", "Email", "Teléfono", "Rol", "Id cliente", "Id contacto"];
  const rows: string[][] = [];
  for (const c of base) {
    if (c.contacts.length === 0) {
      if (rows.length < limit) {
        rows.push([c.displayName, c.legalName, c.taxId ?? "", "", "", "", "", c.id, ""]);
      }
    } else {
      for (const ct of c.contacts) {
        if (rows.length >= limit) break;
        rows.push([
          c.displayName,
          c.legalName,
          c.taxId ?? "",
          ct.name,
          ct.email ?? "",
          ct.phone ?? "",
          ct.roleLabel ?? "",
          c.id,
          ct.id,
        ]);
      }
    }
  }
  return {
    title: "Clientes y contactos",
    headers,
    rows,
    truncated: totalClients > base.length || rows.length >= limit,
  };
}

export type ReportRunInput = Omit<ExportRequest, "format">;

/**
 * Construcción de tabla para vista previa o export (misma lógica).
 */
export async function runReport(organizationId: string, input: ReportRunInput, opt?: { limit?: number }): Promise<ReportTable> {
  switch (input.report) {
    case "ventas":
      return buildVentasTable(organizationId, input.filter as VentasF, opt);
    case "cobranzas":
      return buildCobranzasTable(organizationId, input.filter as CobF, opt);
    case "depositos":
      return buildDepositosTable(organizationId, input.filter as DepF, opt);
    case "conciliaciones":
      return buildConciliacionesTable(organizationId, input.filter as ConF, opt);
    case "clientes":
      return buildClientesTable(organizationId, input.filter as ClF, opt);
  }
}
