import "server-only";

import { currentUser, auth } from "@clerk/nextjs/server";
import { prisma } from "@tracmer-app/database";

import { getServerEnv } from "@/lib/env";
import { ensurePermissionCatalog, seedOrganizationPermissionMatrixIfEmpty } from "@/lib/permissions/seed";

const DEFAULT_ORG_NAME = "Organización";

const SEED_ROLES: { code: string; displayName: string; sortOrder: number }[] = [
  { code: "owner", displayName: "Propietario", sortOrder: 0 },
  { code: "admin", displayName: "Administrador", sortOrder: 1 },
  { code: "operativo", displayName: "Operativo", sortOrder: 2 },
];

async function ensureBaseRoles() {
  for (const r of SEED_ROLES) {
    await prisma.role.upsert({
      where: { code: r.code },
      create: r,
      update: { displayName: r.displayName, sortOrder: r.sortOrder },
    });
  }
}

/**
 * Sincroniza el usuario de Clerk a `users` (sombra).
 * Si no hay **ninguna** organización aún (bootstrap) y el usuario aún no tiene
 * membresía, se crea una org por defecto y rol `owner` — adecuado al primer
 * inquilino. PENDIENTE: invitación cuando la org ya exista y no haya membership.
 */
export async function syncClerkUserToDatabase() {
  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const cu = await currentUser();
  if (!cu) {
    return;
  }

  const email =
    cu.primaryEmailAddress?.emailAddress ??
    cu.emailAddresses[0]?.emailAddress ??
    "pendiente@usuario.local";
  const displayName =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() ||
    (cu.username ?? null) ||
    email;

  const appUser = await prisma.user.upsert({
    where: { clerkUserId: cu.id },
    create: {
      clerkUserId: cu.id,
      email,
      displayName,
    },
    update: {
      email,
      displayName,
      deletedAt: null,
    },
  });

  const hasMembership = await prisma.membership.count({
    where: { userId: appUser.id, deletedAt: null, status: "active" },
  });
  if (hasMembership > 0) {
    return;
  }

  const anyOrg = await prisma.organization.count({
    where: { deletedAt: null },
  });
  if (anyOrg > 0) {
    return;
  }

  await ensureBaseRoles();
  await ensurePermissionCatalog();

  const owner = await prisma.role.findUniqueOrThrow({ where: { code: "owner" } });
  const env = getServerEnv();
  const orgName = env.defaultOrganizationName?.trim() || DEFAULT_ORG_NAME;

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: orgName },
    });
    await seedOrganizationPermissionMatrixIfEmpty(org.id, tx);
    await tx.membership.create({
      data: {
        organizationId: org.id,
        userId: appUser.id,
        roleId: owner.id,
        status: "active",
      },
    });
  });
}
