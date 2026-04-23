import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { CollectionFormCreate } from "@/components/collections/collection-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listImputableSales } from "@/lib/collections/data";
import { createCollection } from "@/lib/collections/actions";
import { todayYmdUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nueva cobranza" };

export default async function NuevaCobranzaPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva cobranza</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/operaciones/cobranzas">Volver</Link>
        </Button>
      </div>
    );
  }
  const sales = await listImputableSales(ctx.currentOrganizationId);
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/operaciones/cobranzas" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Cobranzas
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva cobranza</h1>
        <p className="text-muted-foreground text-sm">
          Bruto, imputaciones a venta(s) y gastos opcionales. Los estados de las ventas se recalculan al guardar.
        </p>
      </div>
      {sales.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay ventas disponibles para imputar (borrador, canceladas o ya cobradas excluidas).{" "}
          <Link className="underline" href="/operaciones/ventas">
            Cargá una venta emitida
          </Link>{" "}
          primero.
        </p>
      ) : null}
      <CollectionFormCreate
        formAction={createCollection}
        sales={sales}
        defaultCollectionDate={todayYmdUtc()}
      />
    </div>
  );
}
