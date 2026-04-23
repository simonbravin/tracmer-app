"use client";

import { UserButton } from "@clerk/nextjs";

import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Separator } from "@/components/ui/separator";

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <div className="truncate text-sm font-medium text-muted-foreground">
          Área de trabajo
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Separator orientation="vertical" className="h-6" />
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
