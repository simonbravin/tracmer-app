"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    [
      defaultDesde,
      defaultHasta,
      pushParams,
      rangeDesde,
      rangeHasta,
    ],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-muted-foreground text-xs">
        Rango aplicado:{" "}
        <span className="tabular-nums text-foreground">{rangeDesde}</span>
        <span className="sr-only"> hasta </span>
        <span aria-hidden className="tabular-nums text-foreground">
          {" "}
          →{" "}
        </span>
        <span className="tabular-nums text-foreground">{rangeHasta}</span>
        . La leyenda bajo los KPIs indica qué fecha usa cada módulo.
      </p>
      <form
        className="grid gap-3"
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="grid gap-1.5">
            <Label htmlFor="tablero-periodo" className="text-xs">
              Período
            </Label>
            <select
              id="tablero-periodo"
              value={periodo}
              onChange={(e) => {
                applyPeriodo(e.target.value as PeriodoPreset);
              }}
              className="border-input bg-background ring-offset-background h-9 min-w-[12rem] rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="mes">Este mes</option>
              <option value="anio">Este año</option>
              <option value="custom">Personalizado</option>
              <option value="total">Total histórico</option>
            </select>
          </div>
          {periodo === "custom" && (
            <>
              <div className="grid gap-1.5">
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
              <div className="grid gap-1.5">
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
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                  {pending ? "…" : "Aplicar fechas"}
                </Button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
