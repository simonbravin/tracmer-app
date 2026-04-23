import "server-only";

import { prisma } from "@tracmer-app/database";

import { parsePermissionKey, type AppModuleCode } from "./catalog";
import { ensurePermissionCatalog, seedOrganizationPermissionMatrixIfEmpty } from "./seed";

export class PermissionDenied extends Error {
  override readonly name = "PermissionDenied";
  constructor(message = "No tenés permiso para esta acción.") {
    super(message);
  }
}

export function isPermissionDenied(e: unknown): e is PermissionDenied {
  return e instanceof PermissionDenied;
}

async function ensureBootstrap(organizationId: string) {
  await ensurePermissionCatalog();
  await seedOrganizationPermissionMatrixIfEmpty(organizationId);
}

/**
 * Comprueba si el módulo está habilitado para el rol en la organización.
 */
export async function requireModuleEnabled(
  organizationId: string,
  roleId: string,
  roleCode: string,
  moduleCode: AppModuleCode | string,
): Promise<void> {
  await ensureBootstrap(organizationId);
  if (roleCode === "owner") {
    return;
  }
  const mod = await prisma.appModule.findUnique({ where: { code: moduleCode } });
  if (!mod) {
    throw new PermissionDenied("Módulo desconocido.");
  }
  const row = await prisma.organizationRoleEnabledModule.findUnique({
    where: {
      organizationId_roleId_moduleId: {
        organizationId,
        roleId,
        moduleId: mod.id,
      },
    },
  });
  if (!row?.isEnabled) {
    throw new PermissionDenied("Este módulo no está habilitado para tu rol.");
  }
}

/**
 * Comprueba permiso persistido (`organization_role_permissions` + módulo habilitado).
 * El rol `owner` omite la matriz (BR §12).
 */
export async function requirePermission(
  organizationId: string,
  roleId: string,
  roleCode: string,
  permissionKey: string,
): Promise<void> {
  const parsed = parsePermissionKey(permissionKey);
  if (!parsed) {
    throw new PermissionDenied("Permiso inválido.");
  }
  await ensureBootstrap(organizationId);
  if (roleCode === "owner") {
    return;
  }
  await requireModuleEnabled(organizationId, roleId, roleCode, parsed.moduleCode);
  const mod = await prisma.appModule.findUnique({ where: { code: parsed.moduleCode } });
  if (!mod) {
    throw new PermissionDenied("Módulo desconocido.");
  }
  const def = await prisma.permissionDefinition.findUnique({
    where: { moduleId_actionCode: { moduleId: mod.id, actionCode: parsed.actionCode } },
  });
  if (!def) {
    throw new PermissionDenied("Definición de permiso no encontrada.");
  }
  const perm = await prisma.organizationRolePermission.findUnique({
    where: {
      organizationId_roleId_permissionDefinitionId: {
        organizationId,
        roleId,
        permissionDefinitionId: def.id,
      },
    },
  });
  if (!perm?.isAllowed) {
    throw new PermissionDenied();
  }
}

export async function hasPermission(
  organizationId: string,
  roleId: string,
  roleCode: string,
  permissionKey: string,
): Promise<boolean> {
  try {
    await requirePermission(organizationId, roleId, roleCode, permissionKey);
    return true;
  } catch (e) {
    if (isPermissionDenied(e)) return false;
    throw e;
  }
}

export async function hasModuleEnabled(
  organizationId: string,
  roleId: string,
  roleCode: string,
  moduleCode: AppModuleCode | string,
): Promise<boolean> {
  try {
    await requireModuleEnabled(organizationId, roleId, roleCode, moduleCode);
    return true;
  } catch (e) {
    if (isPermissionDenied(e)) return false;
    throw e;
  }
}

/** Para server actions: `null` = OK, string = mensaje de error. */
export async function enforcePermission(
  ctx: { organizationId: string; roleId: string; roleCode: string },
  permissionKey: string,
): Promise<string | null> {
  try {
    await requirePermission(ctx.organizationId, ctx.roleId, ctx.roleCode, permissionKey);
    return null;
  } catch (e) {
    if (isPermissionDenied(e)) {
      return e.message || "No tenés permiso para esta acción.";
    }
    throw e;
  }
}
