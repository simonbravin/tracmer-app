"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ChevronDown, Truck } from "lucide-react";

import { appNavigation } from "@/config/navigation";
import { useSidebarLayout } from "@/components/layout/sidebar-layout-context";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const flatLinks = appNavigation.flatMap((s) => s.links);

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarLayout();

  const linkActive = React.useCallback(
    (href: string) =>
      pathname === href ||
      (href !== "/tablero" && pathname.startsWith(`${href}/`)),
    [pathname],
  );

  if (collapsed) {
    return (
      <aside className="hidden w-[4.25rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 shrink-0 flex-col items-center justify-center gap-0.5 border-b border-sidebar-border px-1 py-1">
          <Truck className="h-6 w-6 text-primary" aria-hidden />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={toggleCollapsed}
            aria-label="Expandir barra lateral"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Navegación principal">
          {flatLinks.map((link) => {
            const Icon = link.icon;
            const active = linkActive(link.href);
            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="sr-only">{link.title}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{link.title}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[15.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:w-60">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Truck className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">
              tracmer-app
            </div>
            <div className="truncate text-xs text-muted-foreground">
              Control administrativo
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={toggleCollapsed}
          aria-label="Contraer barra lateral"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <nav className="flex-1 space-y-0 overflow-y-auto p-2" aria-label="Navegación principal">
        {appNavigation.map((section, index) => (
          <React.Fragment key={section.title}>
            <Collapsible defaultOpen className="group space-y-1">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
                <span className="truncate">{section.title}</span>
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="space-y-0.5 pb-2">
                  {section.links.map((link) => {
                    const active = linkActive(link.href);
                    const Icon = link.icon;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                          <span className="truncate">{link.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
            {index < appNavigation.length - 1 ? (
              <Separator className="my-2 bg-sidebar-border" />
            ) : null}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}
