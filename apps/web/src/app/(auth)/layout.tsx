import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

import { clerkLocalization } from "@/lib/clerk-locale";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ClerkProvider localization={clerkLocalization}>
      <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
        {children}
      </div>
    </ClerkProvider>
  );
}
