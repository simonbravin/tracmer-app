import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
