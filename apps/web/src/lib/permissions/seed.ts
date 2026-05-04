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
 * Sincroniza módulo `treasury` y permisos con los de `banks` por cada rol con membresía activa en la org.
 * Idempotente en datos: upsert por (org, rol, definición); debe ejecutarse cuando cambian permisos de bancos
 * para que tesorería siga el mismo criterio de acceso.
 */
export async function syncTreasuryPermissionsFromBanks(organizationId: string, db: Tx | typeof prisma = prisma) {
  const [banksMod, treasuryMod] = await Promise.all([
    db.appModule.findUnique({ where: { code: "banks" } }),
    db.appModule.findUnique({ where: { code: "treasury" } }),
  ]);
  if (!banksMod || !treasuryMod) return;

  const roleIds = await db.membership.findMany({
    where: { organizationId, deletedAt: null },
    select: { roleId: true },
    distinct: ["roleId"],
  });

  const treasuryDefs = await db.permissionDefinition.findMany({
    where: { moduleId: treasuryMod.id },
  });
  if (treasuryDefs.length === 0) return;

  const treasuryByAction = new Map(treasuryDefs.map((d) => [d.actionCode, d.id]));

  for (const { roleId } of roleIds) {
    const bankEnabled = await db.organizationRoleEnabledModule.findUnique({
      where: {
        organizationId_roleId_moduleId: {
          organizationId,
          roleId,
          moduleId: banksMod.id,
        },
      },
    });
    await db.organizationRoleEnabledModule.upsert({
      where: {
        organizationId_roleId_moduleId: {
          organizationId,
          roleId,
          moduleId: treasuryMod.id,
        },
      },
      create: {
        organizationId,
        roleId,
        moduleId: treasuryMod.id,
        isEnabled: bankEnabled?.isEnabled ?? true,
      },
      update: { isEnabled: bankEnabled?.isEnabled ?? true },
    });

    const bankDefs = await db.permissionDefinition.findMany({ where: { moduleId: banksMod.id } });
    for (const bd of bankDefs) {
      const treasuryDefId = treasuryByAction.get(bd.actionCode);
      if (!treasuryDefId) continue;
      const bankPerm = await db.organizationRolePermission.findUnique({
        where: {
          organizationId_roleId_permissionDefinitionId: {
            organizationId,
            roleId,
            permissionDefinitionId: bd.id,
          },
        },
      });
      await db.organizationRolePermission.upsert({
        where: {
          organizationId_roleId_permissionDefinitionId: {
            organizationId,
            roleId,
            permissionDefinitionId: treasuryDefId,
          },
        },
        create: {
          organizationId,
          roleId,
          permissionDefinitionId: treasuryDefId,
          isAllowed: bankPerm?.isAllowed ?? true,
        },
        update: { isAllowed: bankPerm?.isAllowed ?? true },
      });
    }
  }
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
