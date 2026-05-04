import type { Metadata } from "next";
import Link from "next/link";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { PageHeader } from "@/components/common/page-header";
import { ManualMovementForm } from "@/components/treasury/manual-movement-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";
import { listTreasuryLocationsForManualForm } from "@/lib/treasury/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Movimiento manual",
  description: "Ingreso o egreso en caja / billetera",
};

export default async function NuevoMovimientoManualPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="max-w-6xl space-y-4">
        <PageHeader title="Movimiento manual" description="" />
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership.role;
  const can = await hasPermission(orgId, role.id, role.code, P.treasury.create);
  if (!can) {
    return (
      <div className="max-w-6xl space-y-4">
        <PageHeader title="Movimiento manual" description="" />
        <p className="text-muted-foreground text-sm">No tenés permiso para registrar movimientos.</p>
      </div>
    );
  }

  const locs = await listTreasuryLocationsForManualForm(orgId);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tesoreria/transacciones">← Transacciones</Link>
        </Button>
      </div>
      <PageHeader
        title="Movimiento manual"
        description="Solo en ubicaciones que no sean cuenta bancaria. Los bancos usan depósitos y transferencias."
      />
      <Card>
        <CardHeader>
          <CardTitle>Registrar</CardTitle>
          <CardDescription>El monto debe ser positivo; la dirección indica si entra o sale de la ubicación.</CardDescription>
        </CardHeader>
        <CardContent>
          <ManualMovementForm locations={locs} />
        </CardContent>
      </Card>
    </div>
  );
}
