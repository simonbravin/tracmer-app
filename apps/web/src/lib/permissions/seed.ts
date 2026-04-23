import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { APP_MODULES, MODULE_ACTIONS, type AppModuleCode } from "./catalog";

type Tx = Prisma.TransactionClient;

/**
 * Crea / actualiza módulos y definiciones de permiso globales (catálogo).
 */
export async function ensurePermissionCatalog(db: Tx | typeof prisma = prisma) {
  for (const m of APP_MODULES) {
    await db.appModule.upsert({
      where: { code: m.code },
      create: { code: m.code, displayName: m.displayName },
      update: { displayName: m.displayName },
    });
  }
  const modules = await db.appModule.findMany();
  const byCode = new Map(modules.map((x) => [x.code, x]));
  for (const m of APP_MODULES) {
    const mod = byCode.get(m.code);
    if (!mod) continue;
    for (const actionCode of MODULE_ACTIONS[m.code]) {
      await db.permissionDefinition.upsert({
        where: { moduleId_actionCode: { moduleId: mod.id, actionCode } },
        create: { moduleId: mod.id, actionCode },
        update: {},
      });
    }
  }
}

function defaultModuleEnabled(roleCode: string, moduleCode: string): boolean {
  if (roleCode === "owner" || roleCode === "admin") return true;
  if (moduleCode === "settings") return false;
  return true;
}

function defaultPermissionAllowed(roleCode: string, moduleCode: string, actionCode: string): boolean {
  if (roleCode === "owner" || roleCode === "admin") return true;
  if (moduleCode === "settings") return false;
  if (moduleCode === "clients" && actionCode === "archive") return false;
  if (moduleCode === "collections" && actionCode === "archive") return false;
  if (moduleCode === "reconciliations" && actionCode === "archive") return false;
  if (moduleCode === "reports" && actionCode === "send") return false;
  return true;
}

/**
 * Matriz por organización y rol. Solo se ejecuta cuando la org no tiene filas aún
 * (evita pisar cambios del panel de permisos).
 */
export async function seedOrganizationPermissionMatrixIfEmpty(
  organizationId: string,
  db: Tx | typeof prisma = prisma,
) {
  const n = await db.organizationRolePermission.count({ where: { organizationId } });
  if (n > 0) {
    return;
  }
  const [roles, modules, permDefs] = await Promise.all([
    db.role.findMany(),
    db.appModule.findMany(),
    db.permissionDefinition.findMany({ include: { module: true } }),
  ]);
  for (const role of roles) {
    for (const mod of modules) {
      const isEnabled = defaultModuleEnabled(role.code, mod.code);
      await db.organizationRoleEnabledModule.upsert({
        where: {
          organizationId_roleId_moduleId: {
            organizationId,
            roleId: role.id,
            moduleId: mod.id,
          },
        },
        create: { organizationId, roleId: role.id, moduleId: mod.id, isEnabled },
        update: { isEnabled },
      });
    }
    for (const pd of permDefs) {
      const moduleCode = pd.module.code;
      const isAllowed = defaultPermissionAllowed(role.code, moduleCode, pd.actionCode);
      await db.organizationRolePermission.upsert({
        where: {
          organizationId_roleId_permissionDefinitionId: {
            organizationId,
            roleId: role.id,
            permissionDefinitionId: pd.id,
          },
        },
        create: { organizationId, roleId: role.id, permissionDefinitionId: pd.id, isAllowed },
        update: { isAllowed },
      });
    }
  }
}

/** Ajusta defaults solo para combinaciones (rol operativo en settings) si hiciera falta — reservado. */
export function isKnownModuleCode(code: string): code is AppModuleCode {
  return APP_MODULES.some((m) => m.code === code);
}
