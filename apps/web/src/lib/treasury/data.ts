import "server-only";

import type { CurrencyCode, TreasuryLocationKind } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

export async function listTreasuryLocationsForOrg(organizationId: string) {
  return prisma.treasuryLocation.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ kind: "asc" }, { displayName: "asc" }],
    select: {
      id: true,
      kind: true,
      displayName: true,
      currencyCode: true,
      providerCode: true,
      isActive: true,
      bankAccount: {
        select: { id: true, name: true, bankName: true, deletedAt: true, isActive: true },
      },
    },
  });
}

export type TreasuryLocationSelectRow = Awaited<ReturnType<typeof listTreasuryLocationsForOrg>>[number];

/** Ubicaciones no bancarias activas (formulario de movimiento manual). */
export async function listTreasuryLocationsForManualForm(organizationId: string) {
  return prisma.treasuryLocation.findMany({
    where: { organizationId, deletedAt: null, kind: { not: "bank" }, isActive: true },
    select: { id: true, displayName: true, currencyCode: true },
    orderBy: { displayName: "asc" },
  });
}

export async function getTreasuryLocationById(organizationId: string, id: string) {
  return prisma.treasuryLocation.findFirst({
    where: { id, organizationId },
    include: {
      bankAccount: {
        select: {
          id: true,
          name: true,
          bankName: true,
          currencyCode: true,
          accountIdentifierMasked: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });
}

export async function createTreasuryLocationNonBank(
  organizationId: string,
  input: {
    kind: Exclude<TreasuryLocationKind, "bank">;
    displayName: string;
    currencyCode: CurrencyCode;
    providerCode?: string | null;
  },
) {
  return prisma.treasuryLocation.create({
    data: {
      organizationId,
      kind: input.kind,
      displayName: input.displayName.trim(),
      currencyCode: input.currencyCode,
      providerCode: input.providerCode?.trim() || null,
      isActive: true,
    },
    select: { id: true },
  });
}
