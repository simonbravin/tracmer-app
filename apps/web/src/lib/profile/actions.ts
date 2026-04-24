"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@tracmer-app/database";

import { getAppRequestContext } from "@/lib/auth/app-context";

import { formDataToObject, profileFormSchema } from "./validation";

export type ProfileActionState =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function updateUserProfile(
  _prev: ProfileActionState | null,
  formData: FormData,
): Promise<ProfileActionState> {
  const ctx = await getAppRequestContext();
  if (!ctx) {
    return { success: false, error: "No hay sesión." };
  }
  const raw = formDataToObject(formData);
  const parsed = profileFormSchema.safeParse({
    name: raw.name,
    displayName: raw.displayName,
    phone: raw.phone,
    jobTitle: raw.jobTitle,
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
    await prisma.user.update({
      where: { id: ctx.sessionUserId },
      data: {
        name: d.name,
        displayName: d.displayName,
        phone: d.phone,
        jobTitle: d.jobTitle,
      },
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error && process.env.NODE_ENV === "development" ? e.message : "No se pudo guardar.",
    };
  }
  revalidatePath("/configuracion/perfil");
  return { success: true, message: "Perfil actualizado." };
}
