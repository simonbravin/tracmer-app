import type { Metadata } from "next";
import Link from "next/link";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { PageHeader } from "@/components/common/page-header";
import { TreasuryLocationForm } from "@/components/treasury/treasury-location-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nueva ubicación",
  description: "Caja o billetera electrónica",
};

export default async function NuevaUbicacionPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="max-w-6xl space-y-4">
        <PageHeader title="Nueva ubicación" description="" />
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
        <PageHeader title="Nueva ubicación" description="" />
        <p className="text-muted-foreground text-sm">No tenés permiso para crear ubicaciones.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tesoreria/ubicaciones">← Volver</Link>
        </Button>
      </div>
      <PageHeader title="Nueva ubicación" description="Solo caja o billetera; las cuentas bancarias se crean en Bancos." />
      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
          <CardDescription>La moneda no se puede cambiar después sin soporte manual.</CardDescription>
        </CardHeader>
        <CardContent>
          <TreasuryLocationForm />
        </CardContent>
      </Card>
    </div>
  );
}
