import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CollectionStatus } from "@prisma/client";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { CollectionFormEdit } from "@/components/collections/collection-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getCollectionById, listImputableSales, type ImputableSaleRow } from "@/lib/collections/data";
import { updateCollection, type ActionState } from "@/lib/collections/actions";
import { dateToYmdUtc } from "@/lib/sales/format";
import { sumAllocatedToSale } from "@/lib/collections/recompute";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar cobranza" };

type Props = { params: Promise<{ id: string }> };

async function mergeImputable(
  orgId: string,
  base: ImputableSaleRow[],
  collection: NonNullable<Awaited<ReturnType<typeof getCollectionById>>>,
): Promise<ImputableSaleRow[]> {
  const m = new Map(base.map((s) => [s.id, s]));
  for (const a of collection.allocations) {
    if (!a.saleId || m.has(a.saleId) || !a.sale) continue;
    const collected = await sumAllocatedToSale(orgId, a.saleId);
    const s = a.sale;
    const pending = s.totalAmount.minus(collected);
    const client = a.sale.client;
    const label = client
      ? `${client.displayName || client.legalName} — ${s.invoiceNumber?.trim() || a.saleId.slice(0, 8)}`
      : a.saleId;
    m.set(a.saleId, {
      id: a.saleId,
      invoiceNumber: s.invoiceNumber,
      displayLabel: label,
      totalAmount: s.totalAmount.toString(),
      collectedInSaleCurrency: collected.toString(),
      pendingInSaleCurrency: pending.toString(),
      currencyCode: s.currencyCode,
      status: s.status,
    });
  }
  return [...m.values()];
}

export default async function EditarCobranzaPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const org = ctx.currentOrganizationId;
  const c = await getCollectionById(org, id);
  if (!c) notFound();
  if (c.deletedAt) notFound();
  if (c.status === CollectionStatus.voided) notFound();

  const base = await listImputableSales(org);
  const sales = await mergeImputable(org, base, c);

  const allocRows = c.allocations.map((a) => {
    const same = a.sale && a.sale.currencyCode === c.currencyCode;
    return {
      saleId: a.saleId,
      amount: a.amountInCollectionCurrency.toString(),
      fx: same ? "" : a.fxRateToSaleCurrency.toString(),
    };
  });

  const feeRows = c.fees.map((f) => ({
    description: f.description,
    amount: f.amount.toString(),
    currencyCode: f.currencyCode as "ARS" | "USD",
    fx: f.fxRateToCollectionCurrency.toString(),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href={`/operaciones/cobranzas/${c.id}`} className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Detalle
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar cobranza</h1>
        <p className="text-muted-foreground text-sm">Se reemplazan imputaciones y gastos en una transacción.</p>
      </div>
      <CollectionFormEdit
        formAction={
          updateCollection.bind(
            null,
            c.id,
          ) as (a: ActionState | null, f: FormData) => Promise<ActionState>
        }
        listHref={`/operaciones/cobranzas/${c.id}`}
        sales={sales}
        defaultValues={{
          collectionDate: dateToYmdUtc(c.collectionDate),
          currencyCode: c.currencyCode,
          grossAmount: c.grossAmount.toString(),
          paymentMethodCode: c.paymentMethodCode ?? "",
          notes: c.notes ?? "",
          checkNumber: c.checkNumber ?? "",
          checkBankLabel: c.checkBankLabel ?? "",
          fxRateArsPerUnitUsdAtCollection: c.fxRateArsPerUnitUsdAtCollection?.toString() ?? "",
          allocationRows: allocRows,
          feeRows,
        }}
      />
    </div>
  );
}
