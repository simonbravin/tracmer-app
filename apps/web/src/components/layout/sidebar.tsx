"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck } from "lucide-react";

import { appNavigation } from "@/config/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Truck className="h-6 w-6 text-primary" aria-hidden />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">
            tracmer-app
          </div>
          <div className="truncate text-xs text-muted-foreground">
            Control administrativo
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {appNavigation.map((section, index) => (
          <React.Fragment key={section.title}>
            {index > 0 ? (
              <Separator className="bg-sidebar-border" />
            ) : null}
            <div className="space-y-1">
              <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.links.map((link) => {
                  const active =
                    pathname === link.href ||
                    (link.href !== "/tablero" &&
                      pathname.startsWith(`${link.href}/`));
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        {link.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}
