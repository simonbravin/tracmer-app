import type { Metadata } from "next";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { PermissionMatrixEditor } from "@/components/permissions/permission-matrix";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { loadPermissionMatrix } from "@/lib/permissions/matrix-data";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Módulos y permisos",
  description: "Módulos visibles y permisos por rol (por organización)",
};

export default async function PermisosPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Módulos y permisos</h1>
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Módulos y permisos</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
          Definí qué módulos ve cada rol y qué acciones puede ejecutar. La autorización real está en el
          servidor (acciones y APIs). Esta pantalla persiste
          <code className="mx-1 text-xs">organization_role_enabled_modules</code>{" "}
          y <code className="mx-1 text-xs">organization_role_permissions</code>. Usá el conmutador propietario /
          administrador / operativo para editar un rol a la vez.
        </p>
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
