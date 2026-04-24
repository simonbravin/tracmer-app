"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { AppShellBreadcrumbs } from "@/components/layout/app-shell-breadcrumbs";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavCommandMenu } from "@/components/layout/nav-command-menu";
import { useSidebarLayout } from "@/components/layout/sidebar-layout-context";
import { AlertsInAppBell } from "@/components/alerts/alerts-in-app-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";
import type { AlertBellPreviewItem } from "@/lib/alerts/bell-preview";

type AppShellHeaderProps = {
  organizationDisplayName: string;
  alertBell: { openCount: number; preview: AlertBellPreviewItem[] } | null;
};
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AppShellHeader({ organizationDisplayName, alertBell }: AppShellHeaderProps) {
  const { collapsed, toggleCollapsed } = useSidebarLayout();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background px-3 md:gap-3 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <MobileNav organizationDisplayName={organizationDisplayName} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 shrink-0 text-muted-foreground md:inline-flex"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronsLeft className="h-4 w-4" aria-hidden />
          )}
        </Button>
        <AppShellBreadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <NavCommandMenu variant="compact" />
        <ThemeToggle />
        {alertBell ? (
          <AlertsInAppBell openCount={alertBell.openCount} items={alertBell.preview} />
        ) : null}
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <UserNav />
      </div>
    </header>
  );
}
