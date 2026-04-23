import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@tracmer-app/database";

import { getAppRequestContext } from "@/lib/auth/app-context";
import { hashInvitationToken } from "@/lib/membership-invitations/hash-token";
import { sendMembershipInvitationEmail } from "@/lib/membership-invitations/send-invitation-email";

const bodySchema = z.object({
  email: z.string().email(),
  roleCode: z.enum(["admin", "operativo"]),
});

export async function POST(request: Request) {
  const ctx = await getAppRequestContext();
  if (!ctx?.primaryMembership || !ctx.organization) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const roleCode = ctx.primaryMembership.role.code;
  if (roleCode !== "owner" && roleCode !== "admin") {
    return NextResponse.json({ error: "Solo el propietario o un administrador puede invitar." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const orgId = ctx.organization.id;

  const targetRole = await prisma.role.findFirst({
    where: { code: parsed.data.roleCode },
  });
  if (!targetRole) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  const existingUser = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });
  if (existingUser) {
    const already = await prisma.membership.count({
      where: {
        organizationId: orgId,
        userId: existingUser.id,
        deletedAt: null,
        status: "active",
      },
    });
    if (already > 0) {
      return NextResponse.json({ error: "Ese usuario ya es miembro de la organización." }, { status: 409 });
    }
  }

  await prisma.membershipInvitation.updateMany({
    where: {
      organizationId: orgId,
      email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.membershipInvitation.create({
    data: {
      organizationId: orgId,
      email,
      roleId: targetRole.id,
      tokenHash,
      expiresAt,
      invitedByUserId: ctx.appUser.id,
    },
  });

  const sent = await sendMembershipInvitationEmail(email, rawToken, ctx.organization.name);
  if (!sent.ok) {
    await prisma.membershipInvitation.delete({ where: { id: invitation.id } });
    return NextResponse.json({ error: sent.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
