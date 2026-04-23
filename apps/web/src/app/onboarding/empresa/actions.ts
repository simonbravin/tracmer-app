"use server";

import { redirect } from "next/navigation";

import { prisma } from "@tracmer-app/database";

import { requireSessionUserId } from "@/lib/auth/session-user";
import { createOwnerOrganizationForUser } from "@/lib/organization/create-owner-organization";

export async function completeOnboardingForm(
  _prev: { ok: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireSessionUserId();

  const active = await prisma.membership.count({
    where: { userId, deletedAt: null, status: "active" },
  });
  if (active > 0) {
    redirect("/tablero");
  }

  const name = String(formData.get("orgName") ?? "").trim();
  const legalNameRaw = String(formData.get("legalName") ?? "").trim();

  try {
    await createOwnerOrganizationForUser(userId, {
      name,
      legalName: legalNameRaw.length > 0 ? legalNameRaw : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear la organización.";
    return { ok: false, error: msg };
  }

  redirect("/tablero");
}
