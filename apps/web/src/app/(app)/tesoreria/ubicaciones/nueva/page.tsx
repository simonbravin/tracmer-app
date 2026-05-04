import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { TreasuryLocationForm } from "@/components/treasury/treasury-location-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nueva ubicación",
  description: "Caja o billetera electrónica",
};

export default async function NuevaUbicacionPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva ubicación</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership.role;
  const can = await hasPermission(orgId, role.id, role.code, P.treasury_locations.create);
  if (!can) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva ubicación</h1>
        <p className="text-muted-foreground text-sm">No tenés permiso para crear ubicaciones.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/tesoreria/ubicaciones" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Ubicaciones
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva ubicación</h1>
        <p className="text-muted-foreground text-sm">Solo caja o billetera; las cuentas bancarias se crean en Bancos.</p>
      </div>
      <TreasuryLocationForm />
    </div>
  );
}
