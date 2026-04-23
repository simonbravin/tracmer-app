import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

import { AppShell } from "@/components/layout/app-shell";
import { syncClerkUserToDatabase } from "@/lib/auth/server";
import { clerkLocalization } from "@/lib/clerk-locale";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  getServerEnv();
  await syncClerkUserToDatabase();
  return (
    <ClerkProvider localization={clerkLocalization}>
      <AppShell>{children}</AppShell>
    </ClerkProvider>
  );
}
