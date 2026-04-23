import type { Metadata } from "next";
import Link from "next/link";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { PermissionMatrixEditor } from "@/components/permissions/permission-matrix";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { loadPermissionMatrix } from "@/lib/permissions/matrix-data";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Permisos por rol",
  description: "Módulos y permisos persistidos por organización",
};

export default async function PermisosPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Permisos</h1>
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
  const matrix = await loadPermissionMatrix(orgId);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Permisos por rol</h1>
          <p className="text-muted-foreground text-sm">
            La autorización real está en el servidor (acciones y APIs). Esta pantalla solo persiste la matriz
            <code className="mx-1 text-xs">organization_role_*</code>.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/configuracion/modulos-permisos">Módulos y permisos (info)</Link>
        </Button>
      </div>
      {!canManage ? (
        <p className="text-muted-foreground rounded-md border p-4 text-sm">
          No tenés permiso para editar la matriz. Solo usuarios con <code className="text-xs">settings.manage</code>{" "}
          (propietario y administrador por defecto) pueden cambiar estos valores.
        </p>
      ) : (
        <PermissionMatrixEditor matrix={matrix} />
      )}
    </div>
  );
}
