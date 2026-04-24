"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CollectionStatus, CurrencyCode, Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { dateToYmdUtc } from "@/lib/sales/format";
import { checkAllocationsVsGross, collectionNetInCollectionCurrency, feeAmountInCollectionCurrency } from "./amounts";
import { parseCollectionDateInput, getCollectionById } from "./data";
import { recomputeManySales } from "./recompute";
import { toDecimalString } from "./amounts";
import {
  formDataToObject,
  parseCreateCollectionForm,
  safeParseJsonAllocations,
  safeParseJsonFees,
  voidCollectionSchema,
  allocationInputLine,
  feeInputLine,
} from "./validation";
import type { z } from "zod";

const COB = "/operaciones/cobranzas";

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
  return "Ocurri? un error al guardar. Intent? de nuevo.";
}

type AllocLine = z.infer<typeof allocationInputLine>;
type FeeLine = z.infer<typeof feeInputLine>;

async function buildAllocations(
  organizationId: string,
  colCurrency: CurrencyCode,
  lines: AllocLine[],
) {
  const out: {
    saleId: string;
    amountInCollectionCurrency: Prisma.Decimal;
    fxRateToSaleCurrency: Prisma.Decimal;
    amountInSaleCurrency: Prisma.Decimal;
  }[] = [];
  for (const line of lines) {
    const amountCol = new Prisma.Decimal(line.amountInCollectionCurrency);
    if (amountCol.lte(0)) {
      return { ok: false as const, error: "Cada imputaci?n debe ser un monto mayor a 0" };
    }
    const sale = await prisma.sale.findFirst({
      where: { id: line.saleId, organizationId, deletedAt: null },
    });
    if (!sale) {
      return { ok: false as const, error: "Una de las ventas no existe o fue archivada" };
    }
    if (sale.status === SaleStatus.draft || sale.status === SaleStatus.cancelled) {
      return { ok: false as const, error: "No se puede imputar a borradores o ventas canceladas" };
    }
    if (sale.status === SaleStatus.collected) {
      return { ok: false as const, error: "Una de las ventas ya est? completamente cobrada" };
    }
    const saleC = sale.currencyCode;
    let fx: Prisma.Decimal;
    let inSale: Prisma.Decimal;
    if (colCurrency === saleC) {
      fx = new Prisma.Decimal(1);
      inSale = amountCol;
    } else {
      const r = line.fxRateToSaleCurrency;
      if (r == null || r === "") {
        return {
          ok: false as const,
          error: `Indic? la tasa de imputaci?n para la venta ${sale.invoiceNumber?.trim() || line.saleId} (monedas distintas)`,
        };
      }
      fx = new Prisma.Decimal(toDecimalString(r));
      if (fx.lte(0)) {
        return { ok: false as const, error: "La tasa de imputaci?n debe ser > 0" };
      }
      inSale = amountCol.mul(fx);
    }
    out.push({
      saleId: sale.id,
      amountInCollectionCurrency: amountCol,
      fxRateToSaleCurrency: fx,
      amountInSaleCurrency: inSale,
    });
  }
  return { ok: true as const, items: out };
}

type FeeRow = {
  amount: Prisma.Decimal;
  currencyCode: CurrencyCode;
  fxRateToCollectionCurrency: Prisma.Decimal;
  description: string;
};

function sumFeesInCollection(
  _colCurrency: CurrencyCode,
  fees: FeeLine[],
):
  | { ok: true; sum: Prisma.Decimal; rows: FeeRow[] }
  | { ok: false; error: string } {
  let sum = new Prisma.Decimal(0);
  const rows: FeeRow[] = [];
  for (const f of fees) {
    const am = new Prisma.Decimal(f.amount);
    if (am.lte(0)) {
      return { ok: false, error: "Cada gasto debe tener importe mayor a 0" };
    }
    const fx = new Prisma.Decimal(f.fxRateToCollectionCurrency);
    if (fx.lte(0)) {
      return { ok: false, error: "La tasa de cada gasto hacia la moneda de cobranza debe ser > 0" };
    }
    const inCol = feeAmountInCollectionCurrency(am, fx);
    sum = sum.add(inCol);
    rows.push({
      amount: am,
      currencyCode: f.currencyCode as CurrencyCode,
      fxRateToCollectionCurrency: fx,
      description: f.description,
    });
  }
  return { ok: true, sum, rows };
}

function collectionArsEquiv(
  colCurrency: "ARS" | "USD",
  gross: Prisma.Decimal,
  fxUsd: string | undefined,
): { fx: Prisma.Decimal | null; ars: Prisma.Decimal } {
  if (colCurrency === "ARS") {
    return { fx: null, ars: gross };
  }
  const fx = new Prisma.Decimal(String(fxUsd).replace(",", ".").trim());
  return { fx, ars: gross.mul(fx) };
}

function assertNotFutureDate(ymd: string): string | null {
  const today = dateToYmdUtc(new Date());
  if (ymd > today) {
    return "La fecha de cobranza no puede ser futura";
  }
  return null;
}

export async function createCollection(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesit?s una organizaci?n asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.collections.create);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const raw = formDataToObject(formData);
  const base = parseCreateCollectionForm(raw);
  if (!base.success) {
    const fe: Record<string, string> = {};
    for (const e of base.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revis? los campos", fieldErrors: fe };
  }
  const d = base.data;
  const pa = safeParseJsonAllocations(d.allocationsJson);
  if (!pa.ok) {
    return { success: false, error: pa.error, fieldErrors: { allocationsJson: pa.error } };
  }
  const pf = safeParseJsonFees(d.feesJson);
  if (!pf.ok) {
    return { success: false, error: pf.error, fieldErrors: { feesJson: pf.error } };
  }
  const allocLines = pa.data;
  const feeLines = pf.data;

  const dateErr = assertNotFutureDate(d.collectionDate);
  if (dateErr) {
    return { success: false, error: dateErr, fieldErrors: { collectionDate: dateErr } };
  }

  const gross = new Prisma.Decimal(d.grossAmount);
  if (gross.lte(0)) {
    return { success: false, error: "El importe bruto debe ser mayor a 0" };
  }

  const colCurrency = d.currencyCode as CurrencyCode;
  const { fx: colFx, ars: arsEq } = collectionArsEquiv(
    d.currencyCode,
    gross,
    d.fxRateArsPerUnitUsdAtCollection,
  );

  const built = await buildAllocations(orgId, colCurrency, allocLines);
  if (!built.ok) {
    return { success: false, error: built.error };
  }
  const sumAlloc = built.items.reduce(
    (s, i) => s.add(i.amountInCollectionCurrency),
    new Prisma.Decimal(0),
  );
  const chk = checkAllocationsVsGross(gross, sumAlloc);
  if (!chk.ok) {
    return {
      success: false,
      error: `La suma imputada (${sumAlloc.toString()}) no puede superar el bruto (${gross.toString()})`,
    };
  }

  const feeB = sumFeesInCollection(colCurrency, feeLines);
  if (!feeB.ok) {
    return { success: false, error: feeB.error };
  }
  const net = collectionNetInCollectionCurrency(gross, feeB.sum);
  if (net.lt(0)) {
    return { success: false, error: "Los gastos no pueden dejar un neto negativo (bruto ÿÿÿ gastos ÿÿÿ 0)" };
  }

  const saleIds = built.items.map((i) => i.saleId);
  const cDate = parseCollectionDateInput(d.collectionDate);

  let colId: string;
  try {
    colId = await prisma.$transaction(async (tx) => {
      const c = await tx.collection.create({
        data: {
          organizationId: orgId,
          grossAmount: gross,
          currencyCode: colCurrency,
          collectionDate: cDate,
          paymentMethodCode: d.paymentMethodCode,
          notes: d.notes,
          checkNumber: d.checkNumber,
          checkBankLabel: d.checkBankLabel,
          status: CollectionStatus.valid,
          fxRateArsPerUnitUsdAtCollection: colFx,
          amountArsEquivalent: arsEq,
          createdByUserId: org.ctx.appUserId,
        },
        select: { id: true },
      });
      for (const it of built.items) {
        await tx.collectionAllocation.create({
          data: {
            organizationId: orgId,
            collectionId: c.id,
            saleId: it.saleId,
            amountInCollectionCurrency: it.amountInCollectionCurrency,
            fxRateToSaleCurrency: it.fxRateToSaleCurrency,
            amountInSaleCurrency: it.amountInSaleCurrency,
          },
        });
      }
      for (const fr of feeB.rows) {
        await tx.collectionFee.create({
          data: {
            organizationId: orgId,
            collectionId: c.id,
            amount: fr.amount,
            currencyCode: fr.currencyCode,
            fxRateToCollectionCurrency: fr.fxRateToCollectionCurrency,
            description: fr.description,
          },
        });
      }
      return c.id;
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  await recomputeManySales(orgId, saleIds);
  revalidatePath(COB);
  revalidatePath(`${COB}/${colId}`);
  revalidatePath("/alertas");
  revalidatePath("/tablero");
  redirect(`${COB}/${colId}`);
}

export async function updateCollection(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesit?s una organizaci?n asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.collections.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const existing = await prisma.collection.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { allocations: { where: { deletedAt: null } } },
  });
  if (!existing) {
    return { success: false, error: "La cobranza no existe o est? archivada." };
  }
  if (existing.status === CollectionStatus.voided) {
    return { success: false, error: "No se puede editar una cobranza anulada." };
  }
  const beforeSaleIds = [
    ...new Set(existing.allocations.map((a) => a.saleId)),
  ];

  const raw = formDataToObject(formData);
  const base = parseCreateCollectionForm(raw);
  if (!base.success) {
    const fe: Record<string, string> = {};
    for (const e of base.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revis? los campos", fieldErrors: fe };
  }
  const d = base.data;
  const pa = safeParseJsonAllocations(d.allocationsJson);
  if (!pa.ok) {
    return { success: false, error: pa.error, fieldErrors: { allocationsJson: pa.error } };
  }
  const pf = safeParseJsonFees(d.feesJson);
  if (!pf.ok) {
    return { success: false, error: pf.error, fieldErrors: { feesJson: pf.error } };
  }
  const dateErr = assertNotFutureDate(d.collectionDate);
  if (dateErr) {
    return { success: false, error: dateErr, fieldErrors: { collectionDate: dateErr } };
  }
  const gross = new Prisma.Decimal(d.grossAmount);
  if (gross.lte(0)) {
    return { success: false, error: "El importe bruto debe ser mayor a 0" };
  }
  const colCurrency = d.currencyCode as CurrencyCode;
  const { fx: colFx, ars: arsEq } = collectionArsEquiv(
    d.currencyCode,
    gross,
    d.fxRateArsPerUnitUsdAtCollection,
  );
  const built = await buildAllocations(orgId, colCurrency, pa.data);
  if (!built.ok) {
    return { success: false, error: built.error };
  }
  const sumAlloc = built.items.reduce(
    (s, i) => s.add(i.amountInCollectionCurrency),
    new Prisma.Decimal(0),
  );
  if (!checkAllocationsVsGross(gross, sumAlloc).ok) {
    return {
      success: false,
      error: "La suma imputada no puede superar el bruto de la cobranza",
    };
  }
  const feeB = sumFeesInCollection(colCurrency, pf.data);
  if (!feeB.ok) {
    return { success: false, error: feeB.error };
  }
  const net = collectionNetInCollectionCurrency(gross, feeB.sum);
  if (net.lt(0)) {
    return { success: false, error: "Los gastos no pueden dejar un neto negativo" };
  }
  const afterSaleIds = built.items.map((i) => i.saleId);
  const cDate = parseCollectionDateInput(d.collectionDate);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.collectionAllocation.deleteMany({ where: { collectionId: id, organizationId: orgId } });
      await tx.collectionFee.deleteMany({ where: { collectionId: id, organizationId: orgId } });
      await tx.collection.update({
        where: { id: existing.id },
        data: {
          grossAmount: gross,
          currencyCode: colCurrency,
          collectionDate: cDate,
          paymentMethodCode: d.paymentMethodCode,
          notes: d.notes,
          checkNumber: d.checkNumber,
          checkBankLabel: d.checkBankLabel,
          fxRateArsPerUnitUsdAtCollection: colFx,
          amountArsEquivalent: arsEq,
        },
      });
      for (const it of built.items) {
        await tx.collectionAllocation.create({
          data: {
            organizationId: orgId,
            collectionId: id,
            saleId: it.saleId,
            amountInCollectionCurrency: it.amountInCollectionCurrency,
            fxRateToSaleCurrency: it.fxRateToSaleCurrency,
            amountInSaleCurrency: it.amountInSaleCurrency,
          },
        });
      }
      for (const fr of feeB.rows) {
        await tx.collectionFee.create({
          data: {
            organizationId: orgId,
            collectionId: id,
            amount: fr.amount,
            currencyCode: fr.currencyCode,
            fxRateToCollectionCurrency: fr.fxRateToCollectionCurrency,
            description: fr.description,
          },
        });
      }
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  const union = [...new Set([...beforeSaleIds, ...afterSaleIds])];
  await recomputeManySales(orgId, union);
  revalidatePath(COB);
  revalidatePath(`${COB}/${id}`);
  revalidatePath(`${COB}/${id}/editar`);
  revalidatePath("/alertas");
  revalidatePath("/tablero");
  return { success: true, message: "Cobranza actualizada e imputaciones reemplazadas." };
}

export async function voidCollection(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesit?s una organizaci?n asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.collections.archive);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const existing = await prisma.collection.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { allocations: { where: { deletedAt: null } } },
  });
  if (!existing) {
    return { success: false, error: "Cobranza no encontrada o archivada." };
  }
  if (existing.status === CollectionStatus.voided) {
    return { success: false, error: "La cobranza ya est? anulada." };
  }
  const raw = formDataToObject(formData);
  const p = voidCollectionSchema.safeParse({ voidReason: raw.voidReason });
  if (!p.success) {
    return {
      success: false,
      error: "Revis? el motivo de anulaci?n",
      fieldErrors: { voidReason: p.error.issues[0]?.message ?? "Inv?lido" },
    };
  }
  const saleIds = existing.allocations.map((a) => a.saleId);
  const now = new Date();
  try {
    await prisma.collection.update({
      where: { id: existing.id },
      data: {
        status: CollectionStatus.voided,
        voidedAt: now,
        voidReason: p.data.voidReason,
      },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  await recomputeManySales(orgId, saleIds);
  revalidatePath(COB);
  revalidatePath(`${COB}/${id}`);
  revalidatePath("/operaciones/ventas");
  revalidatePath("/alertas");
  revalidatePath("/tablero");
  return { success: true, message: "Cobranza anulada. Las ventas asociadas se recalculan." };
}

export async function archiveCollection(id: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesit?s una organizaci?n asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.collections.archive);
  if (denied) {
    return { success: false, error: denied };
  }
  const orgId = org.ctx.organizationId;
  const existing = await getCollectionById(orgId, id);
  if (!existing || existing.deletedAt) {
    return { success: false, error: "Cobranza no encontrada o ya archivada." };
  }
  const saleIds = existing.allocations.map((a) => a.saleId);
  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.collection.update({
        where: { id: existing.id },
        data: { deletedAt: now },
      }),
      prisma.collectionAllocation.updateMany({
        where: { collectionId: id, organizationId: orgId, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.collectionFee.updateMany({
        where: { collectionId: id, organizationId: orgId, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  await recomputeManySales(orgId, saleIds);
  revalidatePath(COB);
  revalidatePath("/operaciones/ventas");
  revalidatePath("/alertas");
  revalidatePath("/tablero");
  return { success: true, message: "Cobranza archivada." };
}
