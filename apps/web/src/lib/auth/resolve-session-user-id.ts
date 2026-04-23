import "server-only";

import type { Session } from "next-auth";

import { prisma } from "@tracmer-app/database";

/**
 * `session.user.id` debería venir del JWT; si falta (OAuth edge case), resolvemos por email en DB.
 */
export async function resolveSessionUserId(session: Session | null): Promise<string | undefined> {
  if (!session?.user) {
    return undefined;
  }
  const direct = session.user.id;
  if (direct) {
    return direct;
  }
  const email = session.user.email?.trim().toLowerCase();
  if (!email) {
    return undefined;
  }
  const row = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });
  return row?.id;
}
