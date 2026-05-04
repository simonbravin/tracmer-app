"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentToggleButtons } from "@/components/ui/segment-toggle-buttons";
import { cn } from "@/lib/utils";

import { DASHBOARD_TOTAL_DESDE, type PeriodoPreset } from "@/lib/dashboard/validation";

export function DashboardFilters({
  defaultPeriodo,
  defaultDesde,
  defaultHasta,
  rangeDesde,
  rangeHasta,
  className,
}: {
  defaultPeriodo: PeriodoPreset;
  defaultDesde: string;
  defaultHasta: string;
  rangeDesde: string;
  rangeHasta: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [periodo, setPeriodo] = useState<PeriodoPreset>(defaultPeriodo);

  useEffect(() => {
    setPeriodo(defaultPeriodo);
  }, [defaultPeriodo]);

  /** Filtro personalizado: nunca anclar “Desde” en 1900 (malo en el input date). Si el rango venía de Total, hoy = fin de rango. */
  const rawDesde = defaultDesde || rangeDesde;
  const rawHasta = defaultHasta || rangeHasta;
  const customDesdeValue =
    rawDesde === DASHBOARD_TOTAL_DESDE ? rawHasta : rawDesde;
  const customHastaValue = rawHasta;

  const pushParams = useCallback(
    (sp: URLSearchParams) => {
      startTransition(() => {
        router.push(`/tablero?${sp.toString()}`);
      });
    },
    [router],
  );

  const applyPeriodo = useCallback(
    (k: PeriodoPreset) => {
      setPeriodo(k);
      const sp = new URLSearchParams();
      if (k !== "mes") sp.set("periodo", k);
      if (k === "custom") {
        if (rangeDesde === DASHBOARD_TOTAL_DESDE) {
          const hoy = rangeHasta;
          sp.set("desde", hoy);
          sp.set("hasta", hoy);
        } else {
          sp.set("desde", defaultDesde || rangeDesde);
          sp.set("hasta", defaultHasta || rangeHasta);
        }
      }
      pushParams(sp);
    },
    [defaultDesde, defaultHasta, pushParams, rangeDesde, rangeHasta],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (periodo !== "custom") return;
          const fd = new FormData(e.currentTarget);
          const desde = String(fd.get("desde") ?? "");
          const hasta = String(fd.get("hasta") ?? "");
          const sp = new URLSearchParams();
          sp.set("periodo", "custom");
          if (desde && hasta) {
            sp.set("desde", desde);
            sp.set("hasta", hasta);
          }
          pushParams(sp);
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4 sm:gap-y-2">
          <div className="min-w-0 flex-1">
            <SegmentToggleButtons<PeriodoPreset>
              aria-label="Período del tablero"
              disabled={pending}
              items={[
                { value: "mes", label: "Este mes" },
                { value: "anio", label: "Este año" },
                { value: "custom", label: "Personalizado" },
                { value: "total", label: "Total" },
              ]}
              value={periodo}
              onValueChange={applyPeriodo}
            />
          </div>
          <p className="text-muted-foreground shrink-0 text-xs leading-snug sm:max-w-[min(100%,22rem)] sm:text-right">
            <span className="font-medium text-foreground">Rango:</span>{" "}
            <span className="tabular-nums text-foreground">{rangeDesde}</span>
            <span className="sr-only"> hasta </span>
            <span aria-hidden className="tabular-nums text-foreground">
              {" "}
              →{" "}
            </span>
            <span className="tabular-nums text-foreground">{rangeHasta}</span>
            <span className="text-muted-foreground"> · Fechas por módulo en KPIs.</span>
          </p>
        </div>

        {periodo === "custom" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="grid min-w-[8.5rem] flex-1 gap-1.5 sm:max-w-[11rem]">
              <Label htmlFor="tablero-desde" className="text-xs">
                Desde
              </Label>
              <Input
                id="tablero-desde"
                name="desde"
                type="date"
                defaultValue={customDesdeValue}
                required
              />
            </div>
            <div className="grid min-w-[8.5rem] flex-1 gap-1.5 sm:max-w-[11rem]">
              <Label htmlFor="tablero-hasta" className="text-xs">
                Hasta
              </Label>
              <Input
                id="tablero-hasta"
                name="hasta"
                type="date"
                defaultValue={customHastaValue}
                required
              />
            </div>
            <Button type="submit" disabled={pending} size="sm" className="w-full sm:w-auto">
              {pending ? "…" : "Aplicar fechas"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
