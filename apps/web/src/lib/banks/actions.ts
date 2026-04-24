"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CurrencyCode, Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { dateToYmdUtc } from "@/lib/sales/format";
import { parseBankDate, getBankDepositById, getBankTransferById } from "./data";
import {
  formDataToObject,
  parseBankAccountForm,
  parseBankDepositForm,
  parseBankTransferForm,
} from "./validation";

const CUENTAS = "/bancos/cuentas";
const DEPO = "/bancos/depositos";
const TRANS = "/bancos/transferencias";

export type ActionState =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function mapPrismaToMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: string }).code === "string"
  ) {
    const c = (err as { code: string }).code;
    if (c === "P2002") {
      return "Ya existe un registro con esos datos.";
    }
    if (c === "P2003" || c === "P2025") {
      return "No se pudo completar: referencia inexistente.";
    }
  }
  if (err instanceof Error && process.env.NODE_ENV === "development") {
    return err.message;
  }
  return "Ocurrió un error al guardar. Intentá de nuevo.";
}

function arsForAmount(
  currency: "ARS" | "USD",
  amount: Prisma.Decimal,
  fxUsd: string | undefined,
): { fx: Prisma.Decimal | null; ars: Prisma.Decimal } {
  if (currency === "ARS") {
    return { fx: null, ars: amount };
  }
  const fx = new Prisma.Decimal(String(fxUsd).replace(",", ".").trim());
  return { fx, ars: amount.mul(fx) };
}

// --- Cuentas ---

export async function createBankAccount(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = formDataToObject(formData);
  const p = parseBankAccountForm(raw);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const e of p.error.issues) {
      const k = e.path[0];
      if (typeof k === "string") fe[k] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  let acc: { id: string };
  try {
    acc = await prisma.bankAccount.create({
      data: {
        organizationId: org.ctx.organizationId,
        name: d.name,
        bankName: d.bankName,
        currencyCode: d.currencyCode as CurrencyCode,
        accountIdentifierMasked: d.accountIdentifierMasked,
        isActive: d.isActive,
      },
      select: { id: true },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(CUENTAS);
  redirect(`${CUENTAS}/${acc.id}`);
}

export async function updateBankAccount(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const deniedUp = await enforcePermission(org.ctx, P.banks.edit);
  if (deniedUp) {
    return { success: false, error: deniedUp };
  }
  const ex = await prisma.bankAccount.findFirst({
    where: { id, organizationId: org.ctx.organizationId, deletedAt: null },
  });
  if (!ex) {
    return { success: false, error: "La cuenta no existe o está archivada." };
  }
  const raw = formDataToObject(formData);
  const p = parseBankAccountForm(raw);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const e of p.error.issues) {
      const k = e.path[0];
      if (typeof k === "string") fe[k] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  try {
    await prisma.bankAccount.update({
      where: { id: ex.id },
      data: {
        name: d.name,
        bankName: d.bankName,
        currencyCode: d.currencyCode as CurrencyCode,
        accountIdentifierMasked: d.accountIdentifierMasked,
        isActive: d.isActive,
      },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(CUENTAS);
  revalidatePath(`${CUENTAS}/${id}`);
  revalidatePath(`${CUENTAS}/${id}/editar`);
  return { success: true, message: "Cambios guardados." };
}

export async function archiveBankAccount(id: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const ex = await prisma.bankAccount.findFirst({
    where: { id, organizationId: org.ctx.organizationId, deletedAt: null },
  });
  if (!ex) {
    return { success: false, error: "Cuenta no encontrada o ya archivada." };
  }
  try {
    await prisma.bankAccount.update({
      where: { id: ex.id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(CUENTAS);
  revalidatePath(DEPO);
  return { success: true, message: "Cuenta archivada." };
}

// --- Depósitos ---

function assertNotFuture(ymd: string): string | null {
  const t = dateToYmdUtc(new Date());
  if (ymd > t) {
    return "La fecha de depósito no puede ser futura";
  }
  return null;
}

export async function createBankDeposit(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = formDataToObject(formData);
  const p = parseBankDepositForm(raw);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const e of p.error.issues) {
      const k = e.path[0];
      if (typeof k === "string") fe[k] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  const fErr = assertNotFuture(d.depositDate);
  if (fErr) {
    return { success: false, error: fErr, fieldErrors: { depositDate: fErr } };
  }
  const acc = await prisma.bankAccount.findFirst({
    where: { id: d.bankAccountId, organizationId: org.ctx.organizationId, deletedAt: null, isActive: true },
  });
  if (!acc) {
    return { success: false, error: "Cuenta no disponible o archivada." };
  }
  const amount = new Prisma.Decimal(d.amount);
  if (amount.lte(0)) {
    return { success: false, error: "El monto debe ser mayor a 0" };
  }
  const { fx, ars } = arsForAmount(d.currencyCode, amount, d.fxRateArsPerUnitUsdAtDeposit);
  let dep: { id: string };
  try {
    dep = await prisma.bankDeposit.create({
      data: {
        organizationId: org.ctx.organizationId,
        bankAccountId: acc.id,
        depositDate: parseBankDate(d.depositDate),
        amount,
        currencyCode: d.currencyCode as CurrencyCode,
        reference: d.reference,
        fxRateArsPerUnitUsdAtDeposit: fx,
        amountArsEquivalent: ars,
        createdByUserId: org.ctx.appUserId,
      },
      select: { id: true },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(DEPO);
  revalidatePath(CUENTAS);
  redirect(`${DEPO}/${dep.id}`);
}

export async function updateBankDeposit(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const ex = await prisma.bankDeposit.findFirst({
    where: { id, organizationId: org.ctx.organizationId, deletedAt: null },
  });
  if (!ex) {
    return { success: false, error: "Depósito no encontrado o archivado." };
  }
  const raw = formDataToObject(formData);
  const p = parseBankDepositForm(raw);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const e of p.error.issues) {
      const k = e.path[0];
      if (typeof k === "string") fe[k] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  const fErr = assertNotFuture(d.depositDate);
  if (fErr) {
    return { success: false, error: fErr, fieldErrors: { depositDate: fErr } };
  }
  const acc = await prisma.bankAccount.findFirst({
    where: { id: d.bankAccountId, organizationId: org.ctx.organizationId, deletedAt: null, isActive: true },
  });
  if (!acc) {
    return { success: false, error: "Cuenta no disponible o archivada." };
  }
  const amount = new Prisma.Decimal(d.amount);
  if (amount.lte(0)) {
    return { success: false, error: "El monto debe ser mayor a 0" };
  }
  const { fx, ars } = arsForAmount(d.currencyCode, amount, d.fxRateArsPerUnitUsdAtDeposit);
  try {
    await prisma.bankDeposit.update({
      where: { id: ex.id },
      data: {
        bankAccountId: acc.id,
        depositDate: parseBankDate(d.depositDate),
        amount,
        currencyCode: d.currencyCode as CurrencyCode,
        reference: d.reference,
        fxRateArsPerUnitUsdAtDeposit: fx,
        amountArsEquivalent: ars,
      },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(DEPO);
  revalidatePath(CUENTAS);
  revalidatePath(`${DEPO}/${id}`);
  revalidatePath(`${DEPO}/${id}/editar`);
  return { success: true, message: "Depósito actualizado." };
}

export async function archiveBankDeposit(id: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const ex = await getBankDepositById(org.ctx.organizationId, id);
  if (!ex || ex.deletedAt) {
    return { success: false, error: "Depósito no encontrado o archivado." };
  }
  try {
    await prisma.bankDeposit.update({
      where: { id: ex.id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(DEPO);
  revalidatePath(CUENTAS);
  return { success: true, message: "Depósito archivado." };
}

// --- Transferencias entre cuentas (misma moneda; no imputan cobranzas) ---

async function loadTransferAccounts(
  organizationId: string,
  fromId: string,
  toId: string,
): Promise<
  | { ok: true; from: { id: string; currencyCode: CurrencyCode }; to: { id: string; currencyCode: CurrencyCode } }
  | { ok: false; error: string }
> {
  const [from, to] = await Promise.all([
    prisma.bankAccount.findFirst({
      where: { id: fromId, organizationId, deletedAt: null },
      select: { id: true, currencyCode: true, isActive: true },
    }),
    prisma.bankAccount.findFirst({
      where: { id: toId, organizationId, deletedAt: null },
      select: { id: true, currencyCode: true, isActive: true },
    }),
  ]);
  if (!from || !to) {
    return { ok: false, error: "Una de las cuentas no existe o está archivada." };
  }
  if (!from.isActive || !to.isActive) {
    return { ok: false, error: "Ambas cuentas deben estar activas para transferir." };
  }
  if (from.currencyCode !== to.currencyCode) {
    return {
      ok: false,
      error: "Las cuentas deben tener la misma moneda (ARS↔ARS o USD↔USD).",
    };
  }
  return { ok: true, from, to };
}

export async function createBankTransfer(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = formDataToObject(formData);
  const p = parseBankTransferForm(raw);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const e of p.error.issues) {
      const k = e.path[0];
      if (typeof k === "string") fe[k] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  const fErr = assertNotFuture(d.transferDate);
  if (fErr) {
    return { success: false, error: fErr, fieldErrors: { transferDate: fErr } };
  }
  const acc = await loadTransferAccounts(org.ctx.organizationId, d.fromBankAccountId, d.toBankAccountId);
  if (!acc.ok) {
    return { success: false, error: acc.error };
  }
  const amount = new Prisma.Decimal(d.amount);
  if (amount.lte(0)) {
    return { success: false, error: "El monto debe ser mayor a 0" };
  }
  let fee: Prisma.Decimal | null = null;
  if (d.feeAmount != null && d.feeAmount !== "") {
    const f = new Prisma.Decimal(String(d.feeAmount).replace(",", ".").trim());
    if (f.lt(0)) {
      return { success: false, error: "La comisión no puede ser negativa" };
    }
    fee = f.gt(0) ? f : null;
  }
  let xfer: { id: string };
  try {
    xfer = await prisma.bankTransfer.create({
      data: {
        organizationId: org.ctx.organizationId,
        fromBankAccountId: acc.from.id,
        toBankAccountId: acc.to.id,
        transferDate: parseBankDate(d.transferDate),
        amount,
        currencyCode: acc.from.currencyCode,
        feeAmount: fee,
        notes: d.notes,
        createdByUserId: org.ctx.appUserId,
      },
      select: { id: true },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(TRANS);
  revalidatePath(CUENTAS);
  redirect(`${TRANS}/${xfer.id}`);
}

export async function updateBankTransfer(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const ex = await getBankTransferById(org.ctx.organizationId, id);
  if (!ex || ex.deletedAt) {
    return { success: false, error: "Transferencia no encontrada o archivada." };
  }
  const raw = formDataToObject(formData);
  const p = parseBankTransferForm(raw);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const e of p.error.issues) {
      const k = e.path[0];
      if (typeof k === "string") fe[k] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = p.data;
  const fErr = assertNotFuture(d.transferDate);
  if (fErr) {
    return { success: false, error: fErr, fieldErrors: { transferDate: fErr } };
  }
  const acc = await loadTransferAccounts(org.ctx.organizationId, d.fromBankAccountId, d.toBankAccountId);
  if (!acc.ok) {
    return { success: false, error: acc.error };
  }
  const amount = new Prisma.Decimal(d.amount);
  if (amount.lte(0)) {
    return { success: false, error: "El monto debe ser mayor a 0" };
  }
  let fee: Prisma.Decimal | null = null;
  if (d.feeAmount != null && d.feeAmount !== "") {
    const f = new Prisma.Decimal(String(d.feeAmount).replace(",", ".").trim());
    if (f.lt(0)) {
      return { success: false, error: "La comisión no puede ser negativa" };
    }
    fee = f.gt(0) ? f : null;
  }
  try {
    await prisma.bankTransfer.update({
      where: { id: ex.id },
      data: {
        fromBankAccountId: acc.from.id,
        toBankAccountId: acc.to.id,
        transferDate: parseBankDate(d.transferDate),
        amount,
        currencyCode: acc.from.currencyCode,
        feeAmount: fee,
        notes: d.notes,
      },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(TRANS);
  revalidatePath(CUENTAS);
  revalidatePath(`${TRANS}/${id}`);
  revalidatePath(`${TRANS}/${id}/editar`);
  return { success: true, message: "Transferencia actualizada." };
}

export async function archiveBankTransfer(id: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.banks.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const ex = await getBankTransferById(org.ctx.organizationId, id);
  if (!ex || ex.deletedAt) {
    return { success: false, error: "Transferencia no encontrada o archivada." };
  }
  try {
    await prisma.bankTransfer.update({
      where: { id: ex.id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(TRANS);
  revalidatePath(CUENTAS);
  return { success: true, message: "Transferencia archivada." };
}
