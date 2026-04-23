import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ReconciliationLinesForm } from "@/components/reconciliations/reconciliation-lines-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { createReconciliation } from "@/lib/reconciliations/actions";
import { listAvailableCollections, listAvailableDeposits } from "@/lib/reconciliations/data";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nueva conciliación" };

export default async function NuevaConciliacionPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva conciliación</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/conciliaciones">Volver</Link>
        </Button>
      </div>
    );
  }
  const [collections, deposits] = await Promise.all([
    listAvailableCollections(ctx.currentOrganizationId),
    listAvailableDeposits(ctx.currentOrganizationId),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/conciliaciones" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Conciliaciones
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva conciliación</h1>
        <p className="text-muted-foreground text-sm">
          Armá un borrador con una o más líneas (misma moneda por asignación). Cerrar valida y fija
          el impacto en saldos.
        </p>
      </div>
      {collections.length === 0 || deposits.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {collections.length === 0
            ? "No hay cobranzas con saldo pendiente de conciliar. "
            : "No hay depósitos con saldo pendiente. "}
          <Link className="underline" href="/operaciones/cobranzas">Cobranzas</Link> ·{" "}
          <Link className="underline" href="/bancos/depositos">Depósitos</Link>
        </p>
      ) : null}
      {collections.length > 0 && deposits.length > 0 ? (
        <ReconciliationLinesForm
          mode="create"
          formAction={createReconciliation}
          collections={collections}
          deposits={deposits}
        />
      ) : null}
    </div>
  );
}
