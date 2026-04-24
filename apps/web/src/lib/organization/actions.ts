"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@tracmer-app/database";

import { getAppRequestContext } from "@/lib/auth/app-context";

import { ORGANIZATION_TIMEZONE_VALUES } from "./timezones";
import { formDataToObject, organizationSettingsFormSchemaFor } from "./validation";

export type OrganizationActionState =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function updateOrganizationSettings(
  _prev: OrganizationActionState | null,
  formData: FormData,
): Promise<OrganizationActionState> {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return { success: false, error: "No hay organización activa." };
  }
  if (ctx.primaryMembership.role.code !== "owner") {
    return {
      success: false,
      error: "Solo el propietario puede editar los datos de la organización.",
    };
  }

  const orgRow = await prisma.organization.findFirst({
    where: { id: ctx.currentOrganizationId, deletedAt: null },
    select: { timezone: true },
  });
  const allowedTz = new Set<string>([...ORGANIZATION_TIMEZONE_VALUES]);
  if (orgRow?.timezone) {
    allowedTz.add(orgRow.timezone);
  }

  const raw = formDataToObject(formData);
  const parsed = organizationSettingsFormSchemaFor([...allowedTz]).safeParse({
    name: raw.name,
    legalName: raw.legalName,
    timezone: raw.timezone,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = parsed.data;

  try {
    await prisma.organization.update({
      where: { id: ctx.currentOrganizationId },
      data: {
        name: d.name,
        legalName: d.legalName ?? null,
        timezone: d.timezone,
      },
    });
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error && process.env.NODE_ENV === "development"
          ? e.message
          : "No se pudo guardar. Intentá de nuevo.",
    };
  }

  revalidatePath("/configuracion/organizacion");
  revalidatePath("/tablero", "layout");
  return { success: true, message: "Organización actualizada." };
}
