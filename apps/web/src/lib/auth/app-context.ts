import "server-only";

import { prisma } from "@tracmer-app/database";

import { getSessionUserId } from "./session-user";
import type { AppMembership, AppRequestContext } from "./types";

/**
 * Resolución de “quién” + primera membresía / org (MVP).
 * PENDIENTE: “organización activa” con cookie/segmento, multi-org; matriz de permisos en otra capa.
 */
export async function getAppRequestContext(): Promise<AppRequestContext | null> {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return null;
  }

  const appUser = await prisma.user.findFirst({
    where: { id: sessionUserId, deletedAt: null },
  });
  if (!appUser) {
    return null;
  }

  const m = await prisma.membership.findFirst({
    where: {
      userId: appUser.id,
      deletedAt: null,
      status: "active",
    },
    orderBy: { createdAt: "asc" },
    include: { organization: true, role: true },
  });
  const primary: AppMembership | null = m;
  const org = primary?.organization ?? null;
  return {
    sessionUserId,
    appUser,
    primaryMembership: primary,
    organization: org,
    currentOrganizationId: primary?.organizationId ?? null,
  };
}
