"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CurrencyCode, Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { recomputeAndPersistSaleStatus } from "@/lib/collections/recompute";
import { parseInvoiceDateInput } from "@/lib/sales/data";
import { formDataToObject, saleFormSchema, saleUpdateSchema } from "@/lib/sales/validation";

const VENTAS = "/operaciones/ventas";

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

function computeFxAndArs(
  currencyCode: "ARS" | "USD",
  total: Prisma.Decimal,
  fxInput: string | undefined,
): { fx: Prisma.Decimal | null; ars: Prisma.Decimal } {
  if (currencyCode === "ARS") {
    return { fx: null, ars: total };
  }
  const fx = new Prisma.Decimal(String(fxInput).replace(",", ".").trim());
  return { fx, ars: total.mul(fx) };
}

export async function createSale(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.sales.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = formDataToObject(formData);
  const parsed = saleFormSchema.safeParse({
    clientId: raw.clientId,
    invoiceDate: raw.invoiceDate,
    creditDays: raw.creditDays,
    currencyCode: raw.currencyCode,
    totalAmount: raw.totalAmount,
    fxRateArsPerUnitUsdAtIssue: raw.fxRateArsPerUnitUsdAtIssue,
    invoiceNumber: raw.invoiceNumber,
    status: raw.status,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = parsed.data;
  const client = await prisma.client.findFirst({
    where: {
      id: d.clientId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
    },
  });
  if (!client) {
    return { success: false, error: "Elegí un cliente válido (no archivado).", fieldErrors: { clientId: "Cliente no válido" } };
  }
  const total = new Prisma.Decimal(d.totalAmount);
  const { fx, ars } = computeFxAndArs(
    d.currencyCode,
    total,
    d.fxRateArsPerUnitUsdAtIssue,
  );
  const status = d.status as SaleStatus;
  const inv = parseInvoiceDateInput(d.invoiceDate);
  let sale: { id: string };
  try {
    sale = await prisma.sale.create({
      data: {
        organizationId: org.ctx.organizationId,
        clientId: d.clientId,
        status,
        invoiceDate: inv,
        creditDays: d.creditDays,
        currencyCode: d.currencyCode as CurrencyCode,
        totalAmount: total,
        fxRateArsPerUnitUsdAtIssue: fx,
        amountArsEquivalentAtIssue: ars,
        invoiceNumber: d.invoiceNumber,
        createdByUserId: org.ctx.appUserId,
        updatedByUserId: org.ctx.appUserId,
      },
      select: { id: true },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  await recomputeAndPersistSaleStatus(org.ctx.organizationId, sale.id);
  revalidatePath(VENTAS);
  revalidatePath(`${VENTAS}/${sale.id}`);
  revalidatePath("/alertas");
  revalidatePath("/tablero");
  redirect(`${VENTAS}/${sale.id}`);
}

export async function updateSale(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const deniedUp = await enforcePermission(org.ctx, P.sales.edit);
  if (deniedUp) {
    return { success: false, error: deniedUp };
  }
  const existing = await prisma.sale.findFirst({
    where: { id, organizationId: org.ctx.organizationId, deletedAt: null },
  });
  if (!existing) {
    return { success: false, error: "La venta no existe o está archivada." };
  }
  if (existing.status === SaleStatus.collected) {
    return { success: false, error: "No se puede editar una factura ya cobrada." };
  }
  const raw = formDataToObject(formData);
  const parsed = saleUpdateSchema.safeParse({
    clientId: raw.clientId,
    invoiceDate: raw.invoiceDate,
    creditDays: raw.creditDays,
    currencyCode: raw.currencyCode,
    totalAmount: raw.totalAmount,
    fxRateArsPerUnitUsdAtIssue: raw.fxRateArsPerUnitUsdAtIssue,
    invoiceNumber: raw.invoiceNumber,
    status: raw.status,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = parsed.data;
  const client = await prisma.client.findFirst({
    where: {
      id: d.clientId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
    },
  });
  if (!client) {
    return { success: false, error: "Elegí un cliente válido (no archivado).", fieldErrors: { clientId: "Cliente no válido" } };
  }
  const total = new Prisma.Decimal(d.totalAmount);
  const { fx, ars } = computeFxAndArs(
    d.currencyCode,
    total,
    d.fxRateArsPerUnitUsdAtIssue,
  );
  const inv = parseInvoiceDateInput(d.invoiceDate);
  try {
    await prisma.sale.update({
      where: { id: existing.id },
      data: {
        clientId: d.clientId,
        status: d.status,
        invoiceDate: inv,
        creditDays: d.creditDays,
        currencyCode: d.currencyCode as CurrencyCode,
        totalAmount: total,
        fxRateArsPerUnitUsdAtIssue: fx,
        amountArsEquivalentAtIssue: ars,
        invoiceNumber: d.invoiceNumber,
        updatedByUserId: org.ctx.appUserId,
      },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  await recomputeAndPersistSaleStatus(org.ctx.organizationId, id);
  revalidatePath(VENTAS);
  revalidatePath(`${VENTAS}/${id}`);
  revalidatePath(`${VENTAS}/${id}/editar`);
  revalidatePath("/alertas");
  revalidatePath("/tablero");
  return { success: true, message: "Cambios guardados." };
}

export async function archiveSale(saleId: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.sales.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const existing = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: org.ctx.organizationId, deletedAt: null },
  });
  if (!existing) {
    return { success: false, error: "La venta no se encontró o ya está archivada." };
  }
  try {
    await prisma.sale.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(VENTAS);
  revalidatePath(`${VENTAS}/${saleId}`);
  return { success: true, message: "Venta archivada." };
}

export async function cancelSale(saleId: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.sales.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const existing = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: org.ctx.organizationId, deletedAt: null },
  });
  if (!existing) {
    return { success: false, error: "La venta no se encontró o está archivada." };
  }
  if (existing.status === SaleStatus.cancelled) {
    return { success: false, error: "La venta ya está cancelada." };
  }
  if (existing.status === SaleStatus.collected) {
    return { success: false, error: "No se puede cancelar una factura cobrada." };
  }
  try {
    await prisma.sale.update({
      where: { id: existing.id },
      data: { status: SaleStatus.cancelled, updatedByUserId: org.ctx.appUserId },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(VENTAS);
  revalidatePath(`${VENTAS}/${saleId}`);
  return { success: true, message: "Venta anulada (cancelada)." };
}
