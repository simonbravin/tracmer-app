import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { resolveSessionUserId } from "@/lib/auth/resolve-session-user-id";
import { prisma } from "@tracmer-app/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const userId = await resolveSessionUserId(session);
  if (userId) {
    const activeMemberships = await prisma.membership.count({
      where: {
        userId,
        deletedAt: null,
        status: "active",
      },
    });
    if (activeMemberships === 0) {
      redirect("/onboarding/empresa");
    }
    redirect("/tablero");
  }
  redirect("/login");
}
