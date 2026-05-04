import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ManualMovementForm } from "@/components/treasury/manual-movement-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";
import { listTreasuryLocationsForManualForm } from "@/lib/treasury/data";
import { todayYmdUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Movimiento manual",
  description: "Ingreso o egreso en caja / billetera",
};

export default async function NuevoMovimientoManualPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Movimiento manual</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership.role;
  const can = await hasPermission(orgId, role.id, role.code, P.treasury_transactions.create);
  if (!can) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Movimiento manual</h1>
        <p className="text-muted-foreground text-sm">No tenés permiso para registrar movimientos.</p>
      </div>
    );
  }

  const locs = await listTreasuryLocationsForManualForm(orgId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/tesoreria/transacciones" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Transacciones
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Movimiento manual</h1>
        <p className="text-muted-foreground text-sm">
          Solo en ubicaciones que no sean cuenta bancaria. Los bancos usan depósitos y transferencias.
        </p>
      </div>
      <ManualMovementForm locations={locs} defaultMovementDate={todayYmdUtc()} />
    </div>
  );
}
