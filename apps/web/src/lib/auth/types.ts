import type { Membership, Organization, Role, User } from "@tracmer-app/database";

/**
 * Frontera: esto es identidad + **pertenencia** a una org, todavía **no** la matriz de
 * permisos (BR §12) — eso se integrará leyendo tablas de permisos en servidor.
 */
export type AppMembership = Membership & {
  organization: Organization;
  role: Role;
};

export type AppRequestContext = {
  clerkUserId: string;
  appUser: User;
  /**
   * Primera membresía activa en DB (MVP: suele ser una org).
   * PENDIENTE: “organización activa” en cookie/segmento y multi-org.
   */
  primaryMembership: AppMembership | null;
  organization: Organization | null;
  /**
   * organizationId de trabajo actual — hoy: el de `primaryMembership`.
   * PENDIENTE: resolución explícita (cookie) + validación de pertenencia.
   */
  currentOrganizationId: string | null;
};
