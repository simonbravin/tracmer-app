import "server-only";

import { getAppRequestContext } from "@/lib/auth/app-context";

export type OrgContext = {
  organizationId: string;
  appUserId: string;
  roleId: string;
  /** Código de rol global (`owner` | `admin` | `operativo`). */
  roleCode: string;
};

/**
 * Toda operación de negocio requiere membresía activa con `organizationId`.
 * PENDIENTE: selector de org; hoy: primera org activa del usuario.
 */
export async function requireOrganizationContext(): Promise<
  | { ok: true; ctx: OrgContext }
  | { ok: false; error: "no_user" | "no_organization" }
> {
  const app = await getAppRequestContext();
  if (!app) {
    return { ok: false, error: "no_user" };
  }
  const orgId = app.currentOrganizationId;
  const roleId = app.primaryMembership?.roleId;
  const roleCode = app.primaryMembership?.role.code;
  if (!orgId || !roleId || !roleCode) {
    return { ok: false, error: "no_organization" };
  }
  return {
    ok: true,
    ctx: { organizationId: orgId, appUserId: app.appUser.id, roleId, roleCode },
  };
}
