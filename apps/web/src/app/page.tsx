import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@tracmer-app/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    const activeMemberships = await prisma.membership.count({
      where: {
        userId: session.user.id,
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
