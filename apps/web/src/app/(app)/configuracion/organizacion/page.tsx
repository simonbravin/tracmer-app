import type { Metadata } from "next";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { OrganizationSettingsForm } from "@/components/configuracion/organization-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppRequestContext } from "@/lib/auth/app-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organización",
};

export default async function OrganizacionPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.organization) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Organización</h1>
        <NoOrganizationMessage />
      </div>
    );
  }

  const org = ctx.organization;
  const isOwner = ctx.primaryMembership?.role.code === "owner";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organización</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Datos de la empresa en Tracmer. {isOwner ? "Como propietario podés editarlos." : "Solo el propietario puede editarlos."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos generales</CardTitle>
          <CardDescription>Nombre comercial, razón social y zona horaria.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm
            canEdit={isOwner}
            defaultValues={{
              name: org.name,
              legalName: org.legalName ?? "",
              timezone: org.timezone,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
