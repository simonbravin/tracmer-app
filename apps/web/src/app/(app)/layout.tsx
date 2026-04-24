import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { resolveSessionUserId } from "@/lib/auth/resolve-session-user-id";
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
  }

  let organizationDisplayName = "tracmer-app";
  if (userId) {
    const ctx = await getAppRequestContext();
    if (ctx?.organization?.name?.trim()) {
      organizationDisplayName = ctx.organization.name.trim();
    }
  }

  return <AppShell organizationDisplayName={organizationDisplayName}>{children}</AppShell>;
}
