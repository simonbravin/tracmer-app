import type { ReactNode } from "react";

import { TracmerBrand } from "@/components/brand/tracmer-brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <TracmerBrand className="select-none" size="lg" />
        {children}
      </div>
    </div>
  );
}
