import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { SaleFormCreate } from "@/components/sales/sale-form";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listActiveClients } from "@/lib/sales/data";
import { todayYmdUtc } from "@/lib/sales/format";
import { createSale } from "@/lib/sales/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nueva venta" };

export default async function NuevaVentaPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva venta</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/operaciones/ventas">Volver a ventas</Link>
        </Button>
      </div>
    );
  }
  const clients = await listActiveClients(ctx.currentOrganizationId);
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/operaciones/ventas" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Ventas
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Registrar venta</h1>
        <p className="text-muted-foreground text-sm">
          Cliente existente, monto, moneda y, si aplica, tasa de USD a ARS. Sin líneas todavía.
        </p>
      </div>
      <SaleFormCreate
        formAction={createSale}
        defaultInvoiceDate={todayYmdUtc()}
        clients={clients}
      />
    </div>
  );
}
