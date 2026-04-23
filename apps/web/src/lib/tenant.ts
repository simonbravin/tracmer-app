import { getAppRequestContext } from "@/lib/auth/app-context";

/**
 * Multi-tenant: `organizationId` activo se resuelve en servidor
 * (no confiar en query params del cliente). PENDIENTE: org activa vía cookie/segmento.
 */
export type TenantContextPlaceholder = {
  organizationId: string | null;
};

export async function getCurrentOrganizationId(): Promise<string | null> {
  const ctx = await getAppRequestContext();
  return ctx?.currentOrganizationId ?? null;
}
