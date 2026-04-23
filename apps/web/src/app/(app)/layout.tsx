import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@tracmer-app/database";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  getServerEnv();
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
  }
  return <AppShell>{children}</AppShell>;
}
