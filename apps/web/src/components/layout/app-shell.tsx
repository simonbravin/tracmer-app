"use client";

import * as React from "react";

import { AppShellFooter } from "@/components/layout/app-shell-footer";
import { AppShellHeader } from "@/components/layout/app-shell-header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarLayoutProvider } from "@/components/layout/sidebar-layout-context";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Shell alineado a [Efferd App Shell 4](https://efferd.com/blocks/app-shell):
 * layout inset, sidebar con grupos colapsables y modo rail (iconos), contenido con padding generoso.
 */
export function AppShell({
  children,
  organizationDisplayName = "tracmer-app",
}: {
  children: React.ReactNode;
  /** Nombre de la organización activa (sidebar / menú móvil). */
  organizationDisplayName?: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <SidebarLayoutProvider>
        <div className="min-h-dvh bg-muted/40 p-3 sm:p-4 md:p-5">
          <div className="mx-auto flex h-[calc(100dvh-1.5rem)] max-w-[1760px] overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm sm:h-[calc(100dvh-2rem)] md:h-[calc(100dvh-2.5rem)]">
            <Sidebar organizationDisplayName={organizationDisplayName} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <AppShellHeader organizationDisplayName={organizationDisplayName} />
              <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
                {children}
              </main>
              <AppShellFooter />
            </div>
          </div>
        </div>
      </SidebarLayoutProvider>
    </TooltipProvider>
  );
}
