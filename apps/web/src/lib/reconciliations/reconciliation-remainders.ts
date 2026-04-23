import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";
import { mapReconciledByCollection, mapReconciledByDeposit, pendingCollection, pendingDeposit } from "./balances";

export type RemanenteColeccion = { id: string; pending: Prisma.Decimal; gross: Prisma.Decimal; currencyCode: "ARS" | "USD" };
export type RemanenteDeposito = { id: string; pending: Prisma.Decimal; amount: Prisma.Decimal; currencyCode: "ARS" | "USD" };

export async function getRemanentesForEntities(organizationId: string, colIds: string[], depIds: string[]) {
  const uCol = [...new Set(colIds)];
  const uDep = [...new Set(depIds)];
  if (uCol.length === 0 && uDep.length === 0) {
    return { collections: [] as RemanenteColeccion[], deposits: [] as RemanenteDeposito[] };
  }
  const [recC, recD, cols, deps] = await Promise.all([
    mapReconciledByCollection(organizationId),
    mapReconciledByDeposit(organizationId),
    uCol.length
      ? prisma.collection.findMany({
          where: { id: { in: uCol }, organizationId, deletedAt: null },
          select: { id: true, grossAmount: true, currencyCode: true },
        })
      : Promise.resolve([]),
    uDep.length
      ? prisma.bankDeposit.findMany({
          where: { id: { in: uDep }, organizationId, deletedAt: null },
          select: { id: true, amount: true, currencyCode: true },
        })
      : Promise.resolve([]),
  ]);
  const collections: RemanenteColeccion[] = [];
  for (const c of cols) {
    const r = recC.get(c.id) ?? new Prisma.Decimal(0);
    collections.push({
      id: c.id,
      gross: c.grossAmount,
      currencyCode: c.currencyCode,
      pending: pendingCollection(c.grossAmount, r),
    });
  }
  const deposits: RemanenteDeposito[] = [];
  for (const d of deps) {
    const r = recD.get(d.id) ?? new Prisma.Decimal(0);
    deposits.push({
      id: d.id,
      amount: d.amount,
      currencyCode: d.currencyCode,
      pending: pendingDeposit(d.amount, r),
    });
  }
  return { collections, deposits };
}
