import type { ReactNode } from "react";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ensureMembershipBootstrap } from "@/lib/auth/server";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  getServerEnv();
  const session = await auth();
  if (session?.user?.id) {
    await ensureMembershipBootstrap(session.user.id);
  }
  return <AppShell>{children}</AppShell>;
}
