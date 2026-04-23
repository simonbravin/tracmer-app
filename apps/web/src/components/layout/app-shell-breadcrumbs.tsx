"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { appNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

const flat = appNavigation.flatMap((s) => s.links);

function matchNav(pathname: string): { title: string; href: string } | null {
  const sorted = [...flat].sort((a, b) => b.href.length - a.href.length);
  for (const link of sorted) {
    if (pathname === link.href || pathname.startsWith(`${link.href}/`)) {
      return link;
    }
  }
  return null;
}

export function AppShellBreadcrumbs() {
  const pathname = usePathname();
  const hit = matchNav(pathname);

  return (
    <nav
      className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground"
      aria-label="Migas de pan"
    >
      <Link
        href="/tablero"
        className="flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 hover:bg-accent hover:text-accent-foreground"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Inicio</span>
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      {hit ? (
        <span
          className={cn(
            "truncate font-medium",
            pathname === hit.href ? "text-foreground" : "text-foreground/80",
          )}
        >
          {hit.title}
        </span>
      ) : (
        <span className="truncate font-medium text-foreground">Tracmer</span>
      )}
    </nav>
  );
}
