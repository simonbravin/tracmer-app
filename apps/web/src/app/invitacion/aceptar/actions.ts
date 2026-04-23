"use server";

import { redirect } from "next/navigation";

import { acceptMembershipInvitation } from "@/lib/membership-invitations/accept-invitation";

export async function acceptInviteFormAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const token = String(formData.get("token") ?? "").trim();
  const result = await acceptMembershipInvitation(token);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect("/tablero");
}
