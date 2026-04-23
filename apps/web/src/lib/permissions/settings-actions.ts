"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@tracmer-app/database";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

const toggleModuleSchema = z.object({
  roleId: z.string().min(1),
  moduleId: z.string().min(1),
  isEnabled: z.boolean(),
});

const togglePermissionSchema = z.object({
  roleId: z.string().min(1),
  permissionDefinitionId: z.string().min(1),
  isAllowed: z.boolean(),
});

export type ToggleState = { ok: true } | { ok: false; error: string };

export async function toggleRoleModule(input: unknown): Promise<ToggleState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { ok: false, error: "Sin organización" };
  }
  const denied = await enforcePermission(org.ctx, P.settings.manage);
  if (denied) {
    return { ok: false, error: denied };
  }
  const p = toggleModuleSchema.safeParse(input);
  if (!p.success) {
    return { ok: false, error: p.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = p.data;
  try {
    await prisma.organizationRoleEnabledModule.update({
      where: {
        organizationId_roleId_moduleId: {
          organizationId: org.ctx.organizationId,
          roleId: d.roleId,
          moduleId: d.moduleId,
        },
      },
      data: { isEnabled: d.isEnabled },
    });
  } catch {
    return { ok: false, error: "No se pudo actualizar el módulo" };
  }
  revalidatePath("/configuracion/permisos");
  return { ok: true };
}

export async function toggleRolePermission(input: unknown): Promise<ToggleState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { ok: false, error: "Sin organización" };
  }
  const denied = await enforcePermission(org.ctx, P.settings.manage);
  if (denied) {
    return { ok: false, error: denied };
  }
  const p = togglePermissionSchema.safeParse(input);
  if (!p.success) {
    return { ok: false, error: p.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = p.data;
  const pd = await prisma.permissionDefinition.findUnique({
    where: { id: d.permissionDefinitionId },
    include: { module: true },
  });
  if (!pd) {
    return { ok: false, error: "Permiso desconocido" };
  }
  const modRow = await prisma.organizationRoleEnabledModule.findUnique({
    where: {
      organizationId_roleId_moduleId: {
        organizationId: org.ctx.organizationId,
        roleId: d.roleId,
        moduleId: pd.moduleId,
      },
    },
  });
  if (!modRow?.isEnabled && d.isAllowed) {
    return { ok: false, error: "Activá primero el módulo para este rol." };
  }
  try {
    await prisma.organizationRolePermission.update({
      where: {
        organizationId_roleId_permissionDefinitionId: {
          organizationId: org.ctx.organizationId,
          roleId: d.roleId,
          permissionDefinitionId: d.permissionDefinitionId,
        },
      },
      data: { isAllowed: d.isAllowed },
    });
  } catch {
    return { ok: false, error: "No se pudo actualizar el permiso" };
  }
  revalidatePath("/configuracion/permisos");
  return { ok: true };
}
