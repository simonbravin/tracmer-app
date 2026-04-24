"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { appNavigation } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const flatLinks = appNavigation.flatMap((s) => s.links);

export function MobileNav({ organizationDisplayName }: { organizationDisplayName: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu className="h-4 w-4" aria-hidden />
        Menú
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-nav-panel"
            className="absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col gap-2 overflow-y-auto border-r bg-sidebar p-3 text-sidebar-foreground shadow-lg"
          >
            <div className="min-w-0 space-y-0.5 border-b border-sidebar-border pb-2">
              <div className="truncate text-sm font-semibold">{organizationDisplayName}</div>
              <div className="text-muted-foreground text-xs">Navegación</div>
            </div>
            <ul className="space-y-1">
              {flatLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/tablero" &&
                    pathname.startsWith(`${link.href}/`));
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "block rounded-md px-2 py-2 text-sm",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/80",
                      )}
                    >
                      {link.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
