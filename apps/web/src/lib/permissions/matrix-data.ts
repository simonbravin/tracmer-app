import "server-only";

import { prisma } from "@tracmer-app/database";

export type MatrixRow = {
  roleId: string;
  roleCode: string;
  roleName: string;
  modules: { moduleId: string; moduleCode: string; moduleName: string; isEnabled: boolean }[];
  permissions: {
    permissionDefinitionId: string;
    moduleCode: string;
    actionCode: string;
    isAllowed: boolean;
  }[];
};

export async function loadPermissionMatrix(organizationId: string): Promise<MatrixRow[]> {
  const [roles, modules, permDefs, enabledRows, permRows] = await Promise.all([
    prisma.role.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.appModule.findMany({ orderBy: { code: "asc" } }),
    prisma.permissionDefinition.findMany({
      include: { module: true },
      orderBy: [{ module: { code: "asc" } }, { actionCode: "asc" }],
    }),
    prisma.organizationRoleEnabledModule.findMany({ where: { organizationId } }),
    prisma.organizationRolePermission.findMany({ where: { organizationId } }),
  ]);
  const enabledKey = (roleId: string, moduleId: string) =>
    enabledRows.find((r) => r.roleId === roleId && r.moduleId === moduleId)?.isEnabled ?? false;
  const permKey = (roleId: string, pdId: string) =>
    permRows.find((r) => r.roleId === roleId && r.permissionDefinitionId === pdId)?.isAllowed ?? false;

  return roles.map((role) => ({
    roleId: role.id,
    roleCode: role.code,
    roleName: role.displayName,
    modules: modules.map((m) => ({
      moduleId: m.id,
      moduleCode: m.code,
      moduleName: m.displayName,
      isEnabled: enabledKey(role.id, m.id),
    })),
    permissions: permDefs.map((pd) => ({
      permissionDefinitionId: pd.id,
      moduleCode: pd.module.code,
      actionCode: pd.actionCode,
      isAllowed: permKey(role.id, pd.id),
    })),
  }));
}
