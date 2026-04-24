"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentToggleButtons } from "@/components/ui/segment-toggle-buttons";
import { cn } from "@/lib/utils";

import type { PeriodoPreset } from "@/lib/dashboard/validation";

type ClientOption = { id: string; displayName: string; legalName: string };

export function DashboardFilters({
  defaultPeriodo,
  defaultDesde,
  defaultHasta,
  defaultCliente,
  defaultQ,
  rangeDesde,
  rangeHasta,
  clients,
  className,
}: {
  defaultPeriodo: PeriodoPreset;
  defaultDesde: string;
  defaultHasta: string;
  rangeDesde: string;
  rangeHasta: string;
  defaultCliente: string;
  defaultQ: string;
  clients: ClientOption[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [periodo, setPeriodo] = useState<PeriodoPreset>(defaultPeriodo);

  useEffect(() => {
    setPeriodo(defaultPeriodo);
  }, [defaultPeriodo]);

  const pushParams = useCallback(
    (sp: URLSearchParams) => {
      startTransition(() => {
        router.push(`/tablero?${sp.toString()}`);
      });
    },
    [router],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const desde = String(fd.get("desde") ?? "");
          const hasta = String(fd.get("hasta") ?? "");
          const cliente = String(fd.get("cliente") ?? "");
          const q = String(fd.get("q") ?? "");
          const sp = new URLSearchParams();
          if (periodo && periodo !== "mes") sp.set("periodo", periodo);
          if (periodo === "custom" && desde && hasta) {
            sp.set("desde", desde);
            sp.set("hasta", hasta);
          }
          if (cliente) sp.set("cliente", cliente);
          if (q.trim()) sp.set("q", q.trim());
          pushParams(sp);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
          <div className="min-w-0 flex-1">
            <SegmentToggleButtons<PeriodoPreset>
              aria-label="Período del tablero"
              items={[
                { value: "mes", label: "Este mes" },
                { value: "anio", label: "Este año" },
                { value: "custom", label: "Personalizado" },
                { value: "total", label: "Total" },
              ]}
              value={periodo}
              onValueChange={(k) => {
                setPeriodo(k);
                const sp = new URLSearchParams();
                if (k !== "mes") sp.set("periodo", k);
                if (k === "custom") {
                  sp.set("desde", defaultDesde || rangeDesde);
                  sp.set("hasta", defaultHasta || rangeHasta);
                }
                if (defaultCliente) sp.set("cliente", defaultCliente);
                if (defaultQ) sp.set("q", defaultQ);
                pushParams(sp);
              }}
            />
          </div>
          <p className="text-muted-foreground shrink-0 text-sm sm:text-right">
            <span className="font-medium text-foreground">Rango:</span>{" "}
            <span className="tabular-nums">{rangeDesde}</span>
            <span className="sr-only"> hasta </span>
            <span aria-hidden className="tabular-nums">
              {" "}
              →{" "}
            </span>
            <span className="tabular-nums">{rangeHasta}</span>
          </p>
        </div>

        {periodo === "custom" && (
          <div className="grid max-w-md gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="desde" className="text-xs">Desde</Label>
              <Input
                id="desde"
                name="desde"
                type="date"
                defaultValue={defaultDesde || rangeDesde}
                required={periodo === "custom"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hasta" className="text-xs">Hasta</Label>
              <Input
                id="hasta"
                name="hasta"
                type="date"
                defaultValue={defaultHasta || rangeHasta}
                required={periodo === "custom"}
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cliente" className="text-xs">Cliente (facturación y CxC)</Label>
            <select
              id="cliente"
              name="cliente"
              defaultValue={defaultCliente}
              className="border-input bg-background ring-offset-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">
                (todos — facturado/pend. cobro; cobranza y bancos siguen a nivel org.)
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName || c.legalName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="q" className="text-xs">Búsqueda (ventas vencidas, id cobranza no dep.)</Label>
            <Input id="q" name="q" defaultValue={defaultQ} placeholder="Factura, cliente, id cobranza…" autoComplete="off" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            Aplicar
          </Button>
          <p className="text-muted-foreground w-full text-xs sm:w-auto">
            Los accesos rápidos arriba ajustan el rango. &quot;Aplicar&quot; envía el período actual, cliente
            y búsqueda.
          </p>
        </div>
      </form>
    </div>
  );
}
