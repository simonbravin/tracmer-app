import "server-only";

import { prisma } from "@tracmer-app/database";

import { ensurePermissionCatalog, seedOrganizationPermissionMatrixIfEmpty } from "@/lib/permissions/seed";

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

export type CreateOwnerOrganizationInput = {
  name: string;
  legalName?: string | null;
  timezone?: string | null;
};

/**
 * Crea organización + matriz de permisos + membresía `owner` **active** para el usuario.
 * Requiere que el usuario no tenga ya una membresía activa (validar en la capa llamadora).
 */
export async function createOwnerOrganizationForUser(
  userId: string,
  input: CreateOwnerOrganizationInput,
): Promise<{ organizationId: string }> {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("El nombre de la empresa es demasiado corto.");
  }

  await ensureBaseRoles();
  await ensurePermissionCatalog();

  const owner = await prisma.role.findUniqueOrThrow({ where: { code: "owner" } });
  const tz = input.timezone?.trim() || "America/Argentina/Buenos_Aires";
  const legal = input.legalName?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name,
        legalName: legal,
        timezone: tz,
      },
    });
    await seedOrganizationPermissionMatrixIfEmpty(org.id, tx);
    await tx.membership.create({
      data: {
        organizationId: org.id,
        userId,
        roleId: owner.id,
        status: "active",
      },
    });
    return { organizationId: org.id };
  });
}
