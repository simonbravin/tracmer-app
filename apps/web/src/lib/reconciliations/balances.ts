import "server-only";

import { Prisma, ReconciliationStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

const lineWhereClosed = (organizationId: string): Prisma.ReconciliationLineWhereInput => ({
  organizationId,
  deletedAt: null,
  reconciliation: {
    organizationId,
    deletedAt: null,
    status: ReconciliationStatus.closed,
  },
});

/**
 * Suma de importes de cobranza conciliados en estados `closed` (líneas no archivadas).
 * No incluye `draft` ni `voided`.
 */
export async function getReconciledFromCollection(organizationId: string, collectionId: string) {
  const a = await prisma.reconciliationLine.aggregate({
    where: { ...lineWhereClosed(organizationId), collectionId },
    _sum: { amountAppliedFromCollection: true },
  });
  return a._sum.amountAppliedFromCollection ?? new Prisma.Decimal(0);
}

export async function getReconciledToDeposit(organizationId: string, bankDepositId: string) {
  const a = await prisma.reconciliationLine.aggregate({
    where: { ...lineWhereClosed(organizationId), bankDepositId },
    _sum: { amountAppliedToDeposit: true },
  });
  return a._sum.amountAppliedToDeposit ?? new Prisma.Decimal(0);
}

/**
 * Saldos agregados para listados (un query por eje).
 */
export async function mapReconciledByCollection(organizationId: string): Promise<Map<string, Prisma.Decimal>> {
  const rows = await prisma.reconciliationLine.groupBy({
    by: ["collectionId"],
    where: lineWhereClosed(organizationId),
    _sum: { amountAppliedFromCollection: true },
  });
  const m = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    m.set(
      r.collectionId,
      r._sum.amountAppliedFromCollection ?? new Prisma.Decimal(0),
    );
  }
  return m;
}

export async function mapReconciledByDeposit(organizationId: string): Promise<Map<string, Prisma.Decimal>> {
  const rows = await prisma.reconciliationLine.groupBy({
    by: ["bankDepositId"],
    where: lineWhereClosed(organizationId),
    _sum: { amountAppliedToDeposit: true },
  });
  const m = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    m.set(r.bankDepositId, r._sum.amountAppliedToDeposit ?? new Prisma.Decimal(0));
  }
  return m;
}

/**
 * Líneas de un borrador en curso: cuentan al validar cierre, pero aún no cierran saldos
 * hacia otras operaciones. Se usa para: validar tope (no duplicar en 2 sesiones) solo al cerrar.
 * Las líneas en draft (de esta o de otra conciliación) se ignoran al mostrar "pendiente"
 * a menos que excluidas — ver `pendingCollectionExcludingReconciliation`.
 */
export function pendingCollection(
  gross: Prisma.Decimal,
  reconciled: Prisma.Decimal,
): Prisma.Decimal {
  const p = gross.sub(reconciled);
  return p.lt(0) ? new Prisma.Decimal(0) : p;
}

export function pendingDeposit(
  amount: Prisma.Decimal,
  reconciled: Prisma.Decimal,
): Prisma.Decimal {
  const p = amount.sub(reconciled);
  return p.lt(0) ? new Prisma.Decimal(0) : p;
}

/**
 * Suma de líneas en borrador para una cobranza (cualquier conciliación `draft` que no sea `reconExcludingId` si se pasa al editar otra).
 */
export async function sumDraftFromCollection(
  organizationId: string,
  collectionId: string,
  excludeReconciliationId?: string,
) {
  const a = await prisma.reconciliationLine.aggregate({
    where: {
      organizationId,
      collectionId,
      deletedAt: null,
      reconciliation: {
        organizationId,
        deletedAt: null,
        status: ReconciliationStatus.draft,
        ...(excludeReconciliationId ? { id: { not: excludeReconciliationId } } : {}),
      },
    },
    _sum: { amountAppliedFromCollection: true },
  });
  return a._sum.amountAppliedFromCollection ?? new Prisma.Decimal(0);
}

export async function sumDraftToDeposit(organizationId: string, bankDepositId: string, excludeReconciliationId?: string) {
  const a = await prisma.reconciliationLine.aggregate({
    where: {
      organizationId,
      bankDepositId,
      deletedAt: null,
      reconciliation: {
        organizationId,
        deletedAt: null,
        status: ReconciliationStatus.draft,
        ...(excludeReconciliationId ? { id: { not: excludeReconciliationId } } : {}),
      },
    },
    _sum: { amountAppliedToDeposit: true },
  });
  return a._sum.amountAppliedToDeposit ?? new Prisma.Decimal(0);
}