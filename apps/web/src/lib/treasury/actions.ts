"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CurrencyCode, Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";
import { z } from "zod";

import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { parseBankDate } from "@/lib/banks/data";
import { dateToYmdUtc } from "@/lib/sales/format";

import { createTreasuryLocationNonBank } from "./data";

export type TreasuryActionState =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function mapErr(e: unknown): string {
  if (e instanceof Error && process.env.NODE_ENV === "development") {
    return e.message;
  }
  return "Ocurrió un error al guardar. Intentá de nuevo.";
}

const locationSchema = z.object({
  kind: z.enum(["cash", "electronic_wallet"]),
  displayName: z.string().min(1).max(200).trim(),
  currencyCode: z.enum(["ARS", "USD"]),
  providerCode: z.string().max(64).optional().nullable(),
});

export async function createTreasuryLocationAction(
  _prev: TreasuryActionState | null,
  formData: FormData,
): Promise<TreasuryActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.treasury_locations.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const p = locationSchema.safeParse({
    kind: raw.kind,
    displayName: raw.displayName,
    currencyCode: raw.currencyCode,
    providerCode: raw.providerCode || null,
  });
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const i of p.error.issues) {
      const k = i.path[0];
      if (typeof k === "string") fe[k] = i.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  try {
    await createTreasuryLocationNonBank(org.ctx.organizationId, {
      kind: p.data.kind,
      displayName: p.data.displayName,
      currencyCode: p.data.currencyCode as CurrencyCode,
      providerCode: p.data.providerCode,
    });
  } catch (e) {
    return { success: false, error: mapErr(e) };
  }
  revalidatePath("/tesoreria/ubicaciones");
  revalidatePath("/tesoreria/transacciones");
  revalidatePath("/tablero");
  redirect("/tesoreria/ubicaciones");
}

const manualSchema = z.object({
  treasuryLocationId: z.string().cuid(),
  movementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z
    .string()
    .min(1)
    .transform((s) => s.trim().replace(/\s/g, ""))
    .refine((s) => {
      const t = s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s;
      return !Number.isNaN(Number(t)) && Number.isFinite(Number(t));
    }),
  currencyCode: z.enum(["ARS", "USD"]),
  direction: z.enum(["inflow", "outflow"]),
  memo: z.string().max(500).optional().nullable(),
});

export async function createTreasuryManualMovementAction(
  _prev: TreasuryActionState | null,
  formData: FormData,
): Promise<TreasuryActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.treasury_transactions.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const p = manualSchema.safeParse({
    treasuryLocationId: raw.treasuryLocationId,
    movementDate: raw.movementDate,
    amount: raw.amount,
    currencyCode: raw.currencyCode,
    direction: raw.direction,
    memo: raw.memo || null,
  });
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const i of p.error.issues) {
      const k = i.path[0];
      if (typeof k === "string") fe[k] = i.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  const t = dateToYmdUtc(new Date());
  if (d.movementDate > t) {
    return { success: false, error: "La fecha no puede ser futura.", fieldErrors: { movementDate: "Futura" } };
  }
  const amt = new Prisma.Decimal(d.amount.includes(",") && !d.amount.includes(".") ? d.amount.replace(",", ".") : d.amount);
  if (amt.lte(0)) {
    return { success: false, error: "El monto debe ser mayor a 0." };
  }
  const loc = await prisma.treasuryLocation.findFirst({
    where: {
      id: d.treasuryLocationId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
      kind: { not: "bank" },
    },
    select: { id: true, currencyCode: true },
  });
  if (!loc) {
    return { success: false, error: "Ubicación no válida (solo caja o billetera, no cuenta bancaria)." };
  }
  if (loc.currencyCode !== (d.currencyCode as CurrencyCode)) {
    return { success: false, error: "La moneda debe coincidir con la ubicación." };
  }
  try {
    await prisma.treasuryManualMovement.create({
      data: {
        organizationId: org.ctx.organizationId,
        treasuryLocationId: loc.id,
        movementDate: parseBankDate(d.movementDate),
        amount: amt,
        currencyCode: d.currencyCode as CurrencyCode,
        direction: d.direction,
        memo: d.memo?.trim() || null,
        createdByUserId: org.ctx.appUserId,
      },
    });
  } catch (e) {
    return { success: false, error: mapErr(e) };
  }
  revalidatePath("/tesoreria/transacciones");
  revalidatePath("/tesoreria/ubicaciones");
  revalidatePath("/tablero");
  redirect("/tesoreria/transacciones");
}

const manualUpdateSchema = manualSchema.extend({
  id: z.string().cuid(),
});

export async function updateTreasuryManualMovementAction(
  _prev: TreasuryActionState | null,
  formData: FormData,
): Promise<TreasuryActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.treasury_transactions.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const p = manualUpdateSchema.safeParse({
    id: raw.id,
    treasuryLocationId: raw.treasuryLocationId,
    movementDate: raw.movementDate,
    amount: raw.amount,
    currencyCode: raw.currencyCode,
    direction: raw.direction,
    memo: raw.memo || null,
  });
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const i of p.error.issues) {
      const k = i.path[0];
      if (typeof k === "string") fe[k] = i.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  const t = dateToYmdUtc(new Date());
  if (d.movementDate > t) {
    return { success: false, error: "La fecha no puede ser futura.", fieldErrors: { movementDate: "Futura" } };
  }
  const amt = new Prisma.Decimal(d.amount.includes(",") && !d.amount.includes(".") ? d.amount.replace(",", ".") : d.amount);
  if (amt.lte(0)) {
    return { success: false, error: "El monto debe ser mayor a 0." };
  }
  const ex = await prisma.treasuryManualMovement.findFirst({
    where: { id: d.id, organizationId: org.ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!ex) {
    return { success: false, error: "Movimiento no encontrado o archivado." };
  }
  const loc = await prisma.treasuryLocation.findFirst({
    where: {
      id: d.treasuryLocationId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
      kind: { not: "bank" },
    },
    select: { id: true, currencyCode: true },
  });
  if (!loc) {
    return { success: false, error: "Ubicación no válida (solo caja o billetera, no cuenta bancaria)." };
  }
  if (loc.currencyCode !== (d.currencyCode as CurrencyCode)) {
    return { success: false, error: "La moneda debe coincidir con la ubicación." };
  }
  try {
    await prisma.treasuryManualMovement.update({
      where: { id: ex.id },
      data: {
        treasuryLocationId: loc.id,
        movementDate: parseBankDate(d.movementDate),
        amount: amt,
        currencyCode: d.currencyCode as CurrencyCode,
        direction: d.direction,
        memo: d.memo?.trim() || null,
      },
    });
  } catch (e) {
    return { success: false, error: mapErr(e) };
  }
  revalidatePath("/tesoreria/transacciones");
  revalidatePath("/tesoreria/movimientos/" + d.id);
  revalidatePath("/tesoreria/movimientos/" + d.id + "/editar");
  revalidatePath("/tesoreria/ubicaciones");
  revalidatePath("/tablero");
  redirect(`/tesoreria/movimientos/${d.id}`);
}

export type ArchiveTreasuryManualState = { success: true } | { success: false; error: string };

export async function archiveTreasuryManualMovement(id: string): Promise<ArchiveTreasuryManualState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.treasury_transactions.archive);
  if (denied) {
    return { success: false, error: denied };
  }
  const ex = await prisma.treasuryManualMovement.findFirst({
    where: { id, organizationId: org.ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!ex) {
    return { success: false, error: "Movimiento no encontrado o ya archivado." };
  }
  try {
    await prisma.treasuryManualMovement.update({
      where: { id: ex.id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    return { success: false, error: mapErr(e) };
  }
  revalidatePath("/tesoreria/transacciones");
  revalidatePath("/tesoreria/movimientos/" + id);
  revalidatePath("/tesoreria/ubicaciones");
  revalidatePath("/tablero");
  return { success: true };
}
