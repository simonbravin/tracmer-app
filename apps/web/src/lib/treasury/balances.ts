import "server-only";

import type { CurrencyCode, TreasuryLocationKind } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { bankAccountBalancesForIds } from "@/lib/banks/data";
import { feeAmountInCollectionCurrency } from "@/lib/collections/amounts";

const d0 = () => new Prisma.Decimal(0);

/**
 * Saldo por ubicación de fondos (banco = depósitos + transferencias; resto = movimientos manuales).
 * Exportado para listados de ubicaciones.
 */
export async function treasuryBalancesByLocationId(organizationId: string): Promise<Map<string, Prisma.Decimal>> {
  const locs = await prisma.treasuryLocation.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, bankAccount: { select: { id: true } } },
  });
  const out = new Map<string, Prisma.Decimal>();
  const bankPairs = locs.filter((l) => l.bankAccount).map((l) => ({ locId: l.id, bankId: l.bankAccount!.id }));
  const bankIds = bankPairs.map((p) => p.bankId);
  const bankBal = await bankAccountBalancesForIds(organizationId, bankIds);
  for (const { locId, bankId } of bankPairs) {
    out.set(locId, bankBal.get(bankId) ?? d0());
  }
  const nonBankLocIds = locs.filter((l) => !l.bankAccount).map((l) => l.id);
  if (nonBankLocIds.length) {
    const dirs = await prisma.treasuryManualMovement.findMany({
      where: { organizationId, deletedAt: null, treasuryLocationId: { in: nonBankLocIds } },
      select: { treasuryLocationId: true, direction: true, amount: true },
    });
    const signed = new Map<string, Prisma.Decimal>();
    for (const l of nonBankLocIds) {
      signed.set(l, d0());
    }
    for (const m of dirs) {
      const cur = signed.get(m.treasuryLocationId) ?? d0();
      const delta = m.direction === "inflow" ? m.amount : m.amount.neg();
      signed.set(m.treasuryLocationId, cur.add(delta));
    }
    for (const id of nonBankLocIds) {
      out.set(id, signed.get(id) ?? d0());
    }
  }
  return out;
}

export type MoneyBuckets = { ARS: Prisma.Decimal; USD: Prisma.Decimal };

function emptyBuckets(): MoneyBuckets {
  return { ARS: d0(), USD: d0() };
}

function bucket(cc: CurrencyCode): keyof MoneyBuckets {
  return cc === "USD" ? "USD" : "ARS";
}

/** Totales de movimientos en el período (vista efectivo: depósitos, transferencias netas de comisión, manuales). */
export async function treasuryEfectivoPeriodTotals(
  organizationId: string,
  range: { gte: Date; lt: Date },
): Promise<{
  ingresos: MoneyBuckets;
  egresos: MoneyBuckets;
  internosMonto: MoneyBuckets;
  internosCount: number;
}> {
  const ingresos = emptyBuckets();
  const egresos = emptyBuckets();
  const internos = emptyBuckets();
  const [deposits, xfers, manuals] = await Promise.all([
    prisma.bankDeposit.findMany({
      where: {
        organizationId,
        deletedAt: null,
        depositDate: { gte: range.gte, lt: range.lt },
      },
      select: { amount: true, currencyCode: true },
    }),
    prisma.bankTransfer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        transferDate: { gte: range.gte, lt: range.lt },
      },
      select: { amount: true, currencyCode: true, feeAmount: true },
    }),
    prisma.treasuryManualMovement.findMany({
      where: {
        organizationId,
        deletedAt: null,
        movementDate: { gte: range.gte, lt: range.lt },
      },
      select: { amount: true, currencyCode: true, direction: true },
    }),
  ]);

  for (const d of deposits) {
    ingresos[bucket(d.currencyCode)] = ingresos[bucket(d.currencyCode)].add(d.amount);
  }
  for (const t of xfers) {
    const b = bucket(t.currencyCode);
    internos[b] = internos[b].add(t.amount);
    const fee = t.feeAmount ?? d0();
    if (fee.gt(d0())) {
      egresos[b] = egresos[b].add(fee);
    }
  }
  for (const m of manuals) {
    const b = bucket(m.currencyCode);
    if (m.direction === "inflow") {
      ingresos[b] = ingresos[b].add(m.amount);
    } else {
      egresos[b] = egresos[b].add(m.amount);
    }
  }

  return { ingresos, egresos, internosMonto: internos, internosCount: xfers.length };
}

/** Totales vista operativo: cobranzas brutas (ingreso), gastos de cobranza en moneda de cobranza (egreso). */
export async function treasuryOperativoPeriodTotals(
  organizationId: string,
  range: { gte: Date; lt: Date },
): Promise<{ ingresos: MoneyBuckets; egresos: MoneyBuckets }> {
  const ingresos = emptyBuckets();
  const egresos = emptyBuckets();

  const [cols, fees] = await Promise.all([
    prisma.collection.findMany({
      where: {
        organizationId,
        deletedAt: null,
        voidedAt: null,
        status: "valid",
        collectionDate: { gte: range.gte, lt: range.lt },
      },
      select: { grossAmount: true, currencyCode: true },
    }),
    prisma.collectionFee.findMany({
      where: {
        organizationId,
        deletedAt: null,
        collection: {
          voidedAt: null,
          status: "valid",
          deletedAt: null,
          collectionDate: { gte: range.gte, lt: range.lt },
        },
      },
      select: {
        amount: true,
        fxRateToCollectionCurrency: true,
        collection: { select: { currencyCode: true } },
      },
    }),
  ]);

  for (const c of cols) {
    ingresos[bucket(c.currencyCode)] = ingresos[bucket(c.currencyCode)].add(c.grossAmount);
  }
  for (const f of fees) {
    const colCcy = f.collection.currencyCode;
    const inCol = feeAmountInCollectionCurrency(
      f.amount,
      new Prisma.Decimal(f.fxRateToCollectionCurrency),
    );
    egresos[bucket(colCcy)] = egresos[bucket(colCcy)].add(inCol);
  }

  return { ingresos, egresos };
}

export type TreasuryLocationBalanceRow = {
  id: string;
  displayName: string;
  kind: TreasuryLocationKind;
  currencyCode: CurrencyCode;
  balance: string;
};

/** Ubicaciones activas con saldo (para tablero). */
export async function listTreasuryLocationBalancesForDashboard(
  organizationId: string,
): Promise<TreasuryLocationBalanceRow[]> {
  const bals = await treasuryBalancesByLocationId(organizationId);
  const locs = await prisma.treasuryLocation.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
    orderBy: [{ kind: "asc" }, { displayName: "asc" }],
    select: { id: true, displayName: true, kind: true, currencyCode: true },
  });
  return locs.map((l) => ({
    id: l.id,
    displayName: l.displayName,
    kind: l.kind,
    currencyCode: l.currencyCode,
    balance: (bals.get(l.id) ?? d0()).toString(),
  }));
}
