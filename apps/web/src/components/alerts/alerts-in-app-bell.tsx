"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { labelSeverity } from "@/lib/alerts/constants";
import { cn } from "@/lib/utils";

export type AlertFeedPreviewItem = {
  key: string;
  title: string;
  href: string;
  severity: string;
  sortAtIso: string;
};

type Props = {
  total: number;
  items: AlertFeedPreviewItem[];
};

function severityBadgeClass(sev: string) {
  if (sev === "critical") return "bg-destructive/15 text-destructive border-destructive/20";
  if (sev === "high") return "bg-warning/20 text-warning-foreground border-warning/30";
  if (sev === "medium") return "text-foreground";
  return "text-muted-foreground";
}

export function AlertsInAppBell({ total, items }: Props) {
  const n = total > 99 ? "99+" : String(total);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="relative h-9 w-9 shrink-0" aria-label="Resumen de alertas">
          <Bell className="h-4 w-4" />
          {total > 0 ? (
            <Badge
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px]"
              variant="destructive"
            >
              {n}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96" sideOffset={6}>
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Requiere atención</p>
          <p className="text-muted-foreground text-xs">Vencimientos, cobranzas sin depósito, inconsistencias.</p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-muted-foreground p-3 text-sm">No hay alertas abiertas o reconocidas. ¡Todo al día.</p>
          ) : (
            <ul className="divide-y">
              {items.map((it) => (
                <li key={it.key}>
                  <Link
                    href={it.href}
                    className="hover:bg-accent/60 block px-3 py-2.5 text-sm transition-colors"
                  >
                    <span className="line-clamp-2 font-medium leading-snug">{it.title}</span>
                    <span
                      className={cn(
                        "mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        severityBadgeClass(it.severity),
                      )}
                    >
                      {labelSeverity(it.severity)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-2 py-2">
          <Button variant="secondary" className="w-full" size="sm" asChild>
            <Link href="/alertas">Ver listado y filtros</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
