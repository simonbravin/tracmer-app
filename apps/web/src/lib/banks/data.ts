import "server-only";

import type { CurrencyCode } from "@prisma/client";
import { prisma } from "@tracmer-app/database";
import type { Prisma as P } from "@prisma/client";

export function parseBankDate(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(ymd);
  }
  return new Date(`${ymd}T12:00:00.000Z`);
}

export type ListBankAccountsOptions = {
  q?: string;
  visibilidad: "activas" | "archivadas" | "todas";
  page: number;
  pageSize: number;
};

export async function listBankAccounts(organizationId: string, o: ListBankAccountsOptions) {
  const where: P.BankAccountWhereInput = { organizationId };
  if (o.visibilidad === "activas") where.deletedAt = null;
  if (o.visibilidad === "archivadas") where.deletedAt = { not: null };
  const t = o.q?.trim();
  if (t) {
    where.OR = [
      { name: { contains: t, mode: "insensitive" } },
      { bankName: { contains: t, mode: "insensitive" } },
      { accountIdentifierMasked: { contains: t, mode: "insensitive" } },
    ];
  }
  const { page, pageSize } = o;
  const [items, total] = await Promise.all([
    prisma.bankAccount.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        name: true,
        bankName: true,
        currencyCode: true,
        accountIdentifierMasked: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { deposits: true } },
      },
    }),
    prisma.bankAccount.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getBankAccountById(organizationId: string, id: string) {
  return prisma.bankAccount.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { deposits: true } } },
  });
}

export async function listBankAccountsForSelect(organizationId: string) {
  return prisma.bankAccount.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
    select: { id: true, name: true, bankName: true, currencyCode: true },
    orderBy: { name: "asc" },
  });
}

/** Cuentas no archivadas (activas o no), p. ej. filtros de depósitos. */
export async function listBankAccountsForFilter(organizationId: string) {
  return prisma.bankAccount.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, name: true, bankName: true, currencyCode: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

const acctSelect = { id: true, name: true, bankName: true, currencyCode: true } as const;

/**
 * Cuentas elegibles para un depósito (activas y no archivadas).
 * Si se pasa `ensureAccountId` (p. ej. al editar), se incluye esa fila aunque esté inactiva.
 */
export async function listBankAccountsForDepositForm(organizationId: string, ensureAccountId?: string) {
  const base = await prisma.bankAccount.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
    select: acctSelect,
    orderBy: { name: "asc" },
  });
  if (!ensureAccountId || base.some((a) => a.id === ensureAccountId)) {
    return base;
  }
  const extra = await prisma.bankAccount.findFirst({
    where: { id: ensureAccountId, organizationId, deletedAt: null },
    select: acctSelect,
  });
  if (!extra) {
    return base;
  }
  return [extra, ...base];
}

export type ListBankDepositsOptions = {
  q?: string;
  visibilidad: "activas" | "archivadas" | "todas";
  dateFrom?: string;
  dateTo?: string;
  currencyCode?: CurrencyCode;
  bankAccountId?: string;
  page: number;
  pageSize: number;
};

export async function listBankDeposits(organizationId: string, o: ListBankDepositsOptions) {
  const where: P.BankDepositWhereInput = { organizationId };
  if (o.visibilidad === "activas") where.deletedAt = null;
  if (o.visibilidad === "archivadas") where.deletedAt = { not: null };
  if (o.currencyCode) where.currencyCode = o.currencyCode;
  if (o.bankAccountId) where.bankAccountId = o.bankAccountId;
  if (o.dateFrom || o.dateTo) {
    const f: P.DateTimeFilter = {};
    if (o.dateFrom) f.gte = parseBankDate(o.dateFrom);
    if (o.dateTo) {
      const e = parseBankDate(o.dateTo);
      e.setUTCDate(e.getUTCDate() + 1);
      f.lt = e;
    }
    where.depositDate = f;
  }
  const t = o.q?.trim();
  if (t) {
    where.OR = [
      { reference: { contains: t, mode: "insensitive" } },
      { bankAccount: { name: { contains: t, mode: "insensitive" } } },
      { bankAccount: { bankName: { contains: t, mode: "insensitive" } } },
    ];
  }
  const { page, pageSize } = o;
  const [items, total] = await Promise.all([
    prisma.bankDeposit.findMany({
      where,
      orderBy: { depositDate: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        depositDate: true,
        amount: true,
        currencyCode: true,
        reference: true,
        amountArsEquivalent: true,
        fxRateArsPerUnitUsdAtDeposit: true,
        deletedAt: true,
        bankAccount: { select: { id: true, name: true, bankName: true, currencyCode: true } },
      },
    }),
    prisma.bankDeposit.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getBankDepositById(organizationId: string, id: string) {
  return prisma.bankDeposit.findFirst({
    where: { id, organizationId },
    include: {
      bankAccount: { select: { id: true, name: true, bankName: true, currencyCode: true, accountIdentifierMasked: true } },
    },
  });
}
