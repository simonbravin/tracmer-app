import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { SaleFormEdit } from "@/components/sales/sale-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getSaleById, listActiveClients } from "@/lib/sales/data";
import { dateToYmdUtc } from "@/lib/sales/format";
import { updateSale, type ActionState } from "@/lib/sales/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Editar venta" };

type ClientRow = { id: string; displayName: string; legalName: string };

function mergeClientOptions(base: ClientRow[], sale: NonNullable<Awaited<ReturnType<typeof getSaleById>>>) {
  if (!sale.clientId || !sale.client) return base;
  if (base.some((c) => c.id === sale.clientId)) return base;
  return [
    {
      id: sale.client.id,
      displayName: sale.client.displayName,
      legalName: sale.client.legalName,
    },
    ...base,
  ];
}

export default async function EditarVentaPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar venta</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/operaciones/ventas">Volver a ventas</Link>
        </Button>
      </div>
    );
  }
  const org = ctx.currentOrganizationId;
  const s = await getSaleById(org, id);
  if (!s) notFound();
  if (s.deletedAt) notFound();
  if (s.status === "collected") notFound();

  const base = await listActiveClients(org);
  const clients = mergeClientOptions(base, s);

  const def = {
    clientId: s.clientId ?? "",
    invoiceDate: dateToYmdUtc(s.invoiceDate),
    creditDays: String(s.creditDays),
    currencyCode: s.currencyCode as "ARS" | "USD",
    totalAmount: s.totalAmount.toString(),
    fxRateArsPerUnitUsdAtIssue:
      s.currencyCode === "USD" && s.fxRateArsPerUnitUsdAtIssue
        ? s.fxRateArsPerUnitUsdAtIssue.toString()
        : "",
    invoiceNumber: s.invoiceNumber ?? "",
    status: s.status,
  };
  if (!def.clientId) {
    notFound();
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href={`/operaciones/ventas/${s.id}`} className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Detalle de la venta
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar venta</h1>
        <p className="text-muted-foreground text-sm">No se puede editar una factura en estado cobrada.</p>
      </div>
      <SaleFormEdit
        formAction={
          updateSale.bind(
            null,
            s.id,
          ) as (a: ActionState | null, f: FormData) => Promise<ActionState>
        }
        listHref={`/operaciones/ventas/${s.id}`}
        clients={clients}
        defaultValues={def}
      />
    </div>
  );
}
