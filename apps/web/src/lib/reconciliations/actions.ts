"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CurrencyCode, Prisma, ReconciliationStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import {
  getReconciledFromCollection,
  getReconciledToDeposit,
  sumDraftFromCollection,
  sumDraftToDeposit,
} from "./balances";
import { closeDiscrepanciesSchema, parseReconciliationLinesJson, type ReconciliationLineInput } from "./validation";

const BASE = "/bancos/conciliaciones";

function mapPrismaToMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: string }).code === "string"
  ) {
    const c = (err as { code: string }).code;
    if (c === "P2002") {
      return "Conflicto de registro. Intentá de nuevo.";
    }
    if (c === "P2003" || c === "P2025") {
      return "Referencia inexistente o no accesible.";
    }
  }
  if (err instanceof Error && process.env.NODE_ENV === "development") {
    return err.message;
  }
  return "Ocurrió un error. Intentá de nuevo.";
}

export type ActionState =
  | { success: true; message?: string; id?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

async function validateAndLoadEntities(
  tx: Prisma.TransactionClient,
  organizationId: string,
  lines: ReconciliationLineInput[],
  excludeReconciliationId: string | undefined,
) {
  for (const ln of lines) {
    if (new Prisma.Decimal(ln.amount).lte(0)) {
      return { ok: false as const, error: "Cada monto de línea debe ser mayor a 0" };
    }
  }
  const cIds = [...new Set(lines.map((l) => l.collectionId))];
  const dIds = [...new Set(lines.map((l) => l.bankDepositId))];
  const [cols, deps] = await Promise.all([
    tx.collection.findMany({ where: { id: { in: cIds }, organizationId, deletedAt: null } }),
    tx.bankDeposit.findMany({ where: { id: { in: dIds }, organizationId, deletedAt: null } }),
  ]);
  if (cols.length !== cIds.length) {
    return { ok: false as const, error: "Una o más cobranzas no existen o están archivadas." };
  }
  if (deps.length !== dIds.length) {
    return { ok: false as const, error: "Uno o más depósitos no existen o están archivados." };
  }
  for (const ln of lines) {
    const c = cols.find((x) => x.id === ln.collectionId);
    const d = deps.find((x) => x.id === ln.bankDepositId);
    if (!c || c.status !== "valid" || c.voidedAt) {
      return { ok: false as const, error: `Cobranza no válida para conciliar: ${ln.collectionId}` };
    }
    if (c.currencyCode !== d?.currencyCode) {
      return {
        ok: false as const,
        error:
          "Cruce en distinta moneda: en esta versión deberías usar cobranza y depósito en la misma moneda (p. ej. ARS+ARS o USD+USD) en cada línea.",
      };
    }
  }
  for (const c of cols) {
    const g = c.grossAmount;
    const closedR = await getReconciledFromCollection(organizationId, c.id);
    const oDraft = await sumDraftFromCollection(organizationId, c.id, excludeReconciliationId);
    let sumL = new Prisma.Decimal(0);
    for (const ln of lines) {
      if (ln.collectionId === c.id) {
        sumL = sumL.add(new Prisma.Decimal(ln.amount));
      }
    }
    const free = g.sub(closedR).sub(oDraft);
    if (sumL.gt(free) || free.lt(0)) {
      return { ok: false as const, error: `Cobranza excede saldo conciliable o disponible (ID corto: ${c.id.slice(0, 8)}…).` };
    }
  }
  for (const dep of deps) {
    const a = dep.amount;
    const closedD = await getReconciledToDeposit(organizationId, dep.id);
    const oDraftD = await sumDraftToDeposit(organizationId, dep.id, excludeReconciliationId);
    let sumD = new Prisma.Decimal(0);
    for (const ln of lines) {
      if (ln.bankDepositId === dep.id) {
        sumD = sumD.add(new Prisma.Decimal(ln.amount));
      }
    }
    const freeD = a.sub(closedD).sub(oDraftD);
    if (sumD.gt(freeD) || freeD.lt(0)) {
      return { ok: false as const, error: `Depósito excede saldo conciliable o disponible (ID corto: ${dep.id.slice(0, 8)}…).` };
    }
  }
  return { ok: true as const, cols, deps };
}

function revalidateBanksAndOps() {
  revalidatePath(BASE);
  revalidatePath("/bancos/depositos");
  revalidatePath("/operaciones/cobranzas");
}

export async function createReconciliation(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.reconciliations.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const linesJson = String(formData.get("linesJson") ?? "");
  const p = parseReconciliationLinesJson(linesJson);
  if (!p.success) {
    if (typeof p.error === "string") {
      return { success: false, error: p.error };
    }
    const fe: Record<string, string> = {};
    for (const e of p.error.issues) {
      const k = e.path.join(".");
      fe[k] = e.message;
    }
    return { success: false, error: "Revisá las líneas de conciliación", fieldErrors: fe };
  }
  const lines = p.data.lines;
  const notesRaw = String(formData.get("notes") ?? "");
  const notes = notesRaw.trim() ? notesRaw.trim().slice(0, 5000) : null;
  let rId: string;
  try {
    const v = await prisma.$transaction(async (tx) => {
      const chk = await validateAndLoadEntities(tx, orgId, lines, undefined);
      if (!chk.ok) {
        throw new Error(chk.error);
      }
      const r = await tx.reconciliation.create({
        data: {
          organizationId: orgId,
          status: ReconciliationStatus.draft,
          notes,
          createdByUserId: org.ctx.appUserId,
        },
        select: { id: true },
      });
      for (const ln of lines) {
        const amt = new Prisma.Decimal(ln.amount);
        await tx.reconciliationLine.create({
          data: {
            organizationId: orgId,
            reconciliationId: r.id,
            collectionId: ln.collectionId,
            bankDepositId: ln.bankDepositId,
            amountAppliedFromCollection: amt,
            amountAppliedToDeposit: amt,
            fxRateReconciliation: null,
          },
        });
      }
      return r.id;
    });
    rId = v;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : mapPrismaToMessage(e) };
  }
  revalidateBanksAndOps();
  redirect(`${BASE}/${rId}`);
}

export async function updateDraftReconciliation(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.reconciliations.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const ex = await prisma.reconciliation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!ex) {
    return { success: false, error: "La conciliación no existe o está archivada." };
  }
  if (ex.status !== ReconciliationStatus.draft) {
    return { success: false, error: "Solo se puede editar el detalle mientras el estado es Borrador." };
  }
  const linesJson = String(formData.get("linesJson") ?? "");
  const p = parseReconciliationLinesJson(linesJson);
  if (!p.success) {
    if (typeof p.error === "string") {
      return { success: false, error: p.error };
    }
    return { success: false, error: "Revisá las líneas" };
  }
  const lines = p.data.lines;
  const notesRaw = String(formData.get("notes") ?? "");
  const notes = notesRaw.trim() ? notesRaw.trim().slice(0, 5000) : null;
  try {
    await prisma.$transaction(async (tx) => {
      const chk = await validateAndLoadEntities(tx, orgId, lines, id);
      if (!chk.ok) {
        throw new Error(chk.error);
      }
      await tx.reconciliationLine.deleteMany({ where: { reconciliationId: id, organizationId: orgId } });
      await tx.reconciliation.update({ where: { id }, data: { notes } });
      for (const ln of lines) {
        const amt = new Prisma.Decimal(ln.amount);
        await tx.reconciliationLine.create({
          data: {
            organizationId: orgId,
            reconciliationId: id,
            collectionId: ln.collectionId,
            bankDepositId: ln.bankDepositId,
            amountAppliedFromCollection: amt,
            amountAppliedToDeposit: amt,
            fxRateReconciliation: null,
          },
        });
      }
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : mapPrismaToMessage(e) };
  }
  revalidateBanksAndOps();
  revalidatePath(`${BASE}/${id}`);
  return { success: true, message: "Borrador actualizado." };
}

export async function closeReconciliation(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.reconciliations.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const ex = await prisma.reconciliation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { lines: { where: { deletedAt: null } } },
  });
  if (!ex) {
    return { success: false, error: "La conciliación no existe o está archivada." };
  }
  if (ex.status !== ReconciliationStatus.draft) {
    return { success: false, error: "Solo se puede cerrar un borrador." };
  }
  if (ex.lines.length === 0) {
    return { success: false, error: "Agregá al menos una línea antes de cerrar." };
  }
  const disc = String(formData.get("discrepanciesJson") ?? "[]");
  let dParsed;
  try {
    dParsed = closeDiscrepanciesSchema.parse(JSON.parse(disc));
  } catch {
    return { success: false, error: "Diferencias: no válido." };
  }
  const lineInputs: ReconciliationLineInput[] = ex.lines.map((L) => ({
    collectionId: L.collectionId,
    bankDepositId: L.bankDepositId,
    amount: L.amountAppliedFromCollection.toString(),
  }));
  try {
    await prisma.$transaction(async (tx) => {
      const chk = await validateAndLoadEntities(tx, orgId, lineInputs, id);
      if (!chk.ok) {
        throw new Error(chk.error);
      }
      for (const d of dParsed) {
        if (new Prisma.Decimal(d.amount).lte(0)) {
          throw new Error("Cada importe de diferencia debe ser mayor a 0 (o vaciá el listado).");
        }
        const lid = d.lineId ?? null;
        if (lid) {
          const L = ex.lines.find((l) => l.id === lid);
          if (!L) {
            throw new Error("Diferencia: línea vinculada inexistente.");
          }
        }
        await tx.reconciliationDiscrepancy.create({
          data: {
            organizationId: orgId,
            reconciliationId: id,
            reconciliationLineId: d.lineId ?? null,
            categoryCode: d.categoryCode,
            amount: new Prisma.Decimal(d.amount),
            currencyCode: d.currencyCode as CurrencyCode,
            notes: d.notes ?? null,
          },
        });
      }
      await tx.reconciliation.update({
        where: { id },
        data: {
          status: ReconciliationStatus.closed,
          closedAt: new Date(),
          closedByUserId: org.ctx.appUserId,
        },
      });
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : mapPrismaToMessage(e) };
  }
  revalidateBanksAndOps();
  revalidatePath(`${BASE}/${id}`);
  return { success: true, message: "Conciliación cerrada." };
}

/**
 * `void` anula el efecto contable: las líneas de conciliación `closed` o el borrador dejan de
 * considerarse en el saldo (la query usa solo `closed` → `voided` queda excluido; borrador → voided sin cerrar nunca afectó closed).
 * Conciliación cerrada anulada: queda rastro, sin borrar líneas.
 */
export async function voidReconciliation(id: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.reconciliations.archive);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const ex = await prisma.reconciliation.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
  if (!ex) {
    return { success: false, error: "Registro no encontrado." };
  }
  if (ex.status === ReconciliationStatus.voided) {
    return { success: false, error: "Ya estaba anulada." };
  }
  try {
    await prisma.reconciliation.update({
      where: { id: ex.id },
      data: { status: ReconciliationStatus.voided },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidateBanksAndOps();
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  return { success: true, message: "Conciliación anulada. Los importes vuelven a quedar conciliables." };
}

/** Archiva (soft delete) solo conciliaciones en `draft` o `voided`, para no ocultar cierres. */
export async function archiveReconciliation(id: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.reconciliations.archive);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const ex = await prisma.reconciliation.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
  if (!ex) {
    return { success: false, error: "Registro no encontrado." };
  }
  if (ex.status === ReconciliationStatus.closed) {
    return {
      success: false,
      error: "No se archiva una conciliación cerrada: anulá primero si corresponde.",
    };
  }
  try {
    await prisma.reconciliation.update({
      where: { id: ex.id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidateBanksAndOps();
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id}`);
  return { success: true, message: "Archivada." };
}
