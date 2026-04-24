"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useDashboardAlerts } from "./dashboard-alerts-context";

export function DashboardAlertsBanner() {
  const { openHighCount, dismissed, dismiss } = useDashboardAlerts();

  if (dismissed) {
    return null;
  }

  const description =
    openHighCount > 0
      ? `${openHighCount} alerta(s) alta o crítica sin cerrar.`
      : "Sin alertas de prioridad elevada en este momento.";

  return (
    <Card className="relative w-full">
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground ring-offset-background absolute right-2 top-2 rounded-sm p-1.5 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Ocultar aviso de alertas en el tablero"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <CardContent className="p-3 pr-11 sm:p-4 sm:pr-12">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="shrink-0 text-base font-semibold leading-none">Alertas</span>
            <p className="text-muted-foreground text-sm leading-snug sm:min-w-0 sm:truncate">
              {description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/alertas">Ver alertas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/configuracion/alertas">Email y registro</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
