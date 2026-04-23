import type { CollectionStatus } from "@prisma/client";

const LABELS: Record<CollectionStatus, string> = {
  valid: "Válida",
  voided: "Anulada",
};

export function labelCollectionStatus(s: CollectionStatus): string {
  return LABELS[s] ?? s;
}

export const collectionStatusesForList = ["valid", "voided"] as const satisfies readonly CollectionStatus[];
