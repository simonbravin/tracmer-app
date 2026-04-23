import "server-only";

import { prisma } from "@tracmer-app/database";

import { getSessionUserId } from "@/lib/auth/session-user";

import { hashInvitationToken } from "./hash-token";

export type AcceptInvitationResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

/**
 * Consume invitación: crea `Membership` **active** y marca `accepted_at`.
 */
export async function acceptMembershipInvitation(rawToken: string): Promise<AcceptInvitationResult> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, error: "Falta el token de invitación." };
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: "Iniciá sesión para aceptar la invitación." };
  }
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!user) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  const tokenHash = hashInvitationToken(token);
  const inv = await prisma.membershipInvitation.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { organization: true, role: true },
  });

  if (!inv) {
    return { ok: false, error: "Invitación inválida o vencida." };
  }

  if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
    return {
      ok: false,
      error: "Iniciaste sesión con otro correo. Cerrá sesión e ingresá con el correo al que llegó la invitación.",
    };
  }

  if (inv.role.code === "owner") {
    return { ok: false, error: "Esta invitación no es válida." };
  }

  const existing = await prisma.membership.count({
    where: {
      organizationId: inv.organizationId,
      userId: user.id,
      deletedAt: null,
      status: "active",
    },
  });
  if (existing > 0) {
    return { ok: false, error: "Ya sos miembro de esta organización." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          organizationId: inv.organizationId,
          userId: user.id,
          roleId: inv.roleId,
          status: "active",
        },
      });
      await tx.membershipInvitation.update({
        where: { id: inv.id },
        data: { acceptedAt: new Date() },
      });
      await tx.membershipInvitation.updateMany({
        where: {
          organizationId: inv.organizationId,
          email: inv.email,
          acceptedAt: null,
          id: { not: inv.id },
        },
        data: { revokedAt: new Date() },
      });
    });
  } catch {
    return { ok: false, error: "No se pudo completar la invitación. Probá de nuevo." };
  }

  return { ok: true, organizationId: inv.organizationId };
}
