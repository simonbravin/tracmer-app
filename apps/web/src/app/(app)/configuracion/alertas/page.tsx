import type { Metadata } from "next";
import Link from "next/link";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { OrganizationAlertSettingsForm } from "@/components/configuracion/alert-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationAlertSettings } from "@/lib/alert-settings/data";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reglas de alertas",
  description: "Notificaciones por email y referencia a alertas del sistema",
};

export default async function AlertasConfigPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Alertas (configuración)</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership?.role;
  if (!role) {
    return <p className="text-muted-foreground text-sm">No se encontró rol de membresía.</p>;
  }
  const canManage = await hasPermission(orgId, role.id, role.code, P.settings.manage);
  const initial = await getOrganizationAlertSettings(orgId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reglas de alertas</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          Qué se puede notificar por email. Las <Link href="/alertas" className="text-primary underline-offset-4 hover:underline">alertas en la app</Link>{" "}
          (vencimientos, cobranzas, inconsistencias) siguen en el listado dedicado; acá ajustás destinatarios y tipos para
          el futuro envío automático y probás Resend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notificaciones por email</CardTitle>
          <CardDescription>
            Destinatarios y tipos. El envío programado o por umbral requiere tarea en el servidor; esta pantalla persiste
            preferencias y permite una prueba manual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationAlertSettingsForm canManage={canManage} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
