import "server-only";

import { prisma } from "@tracmer-app/database";

import { getClerkUserId } from "./clerk-ids";
import type { AppRequestContext, AppMembership } from "./types";

/**
 * Resolución de “quién” + primera membresía / org (MVP).
 * PENDIENTE: “organización activa” con cookie/segmento, multi-org, matriz de permisos.
 */
export async function getAppRequestContext(): Promise<AppRequestContext | null> {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return null;
  }

  const appUser = await prisma.user.findFirst({
    where: { clerkUserId, deletedAt: null },
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
    clerkUserId,
    appUser,
    primaryMembership: primary,
    organization: org,
    currentOrganizationId: primary?.organizationId ?? null,
  };
}
