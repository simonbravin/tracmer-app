"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Vista = "efectivo" | "operativo";

type LocOpt = { id: string; displayName: string; kind: string; currencyCode: string };

export function TransactionsFilters({
  defaultVista,
  defaultDesde,
  defaultHasta,
  defaultMoneda,
  defaultUbicacion,
  defaultFlujo,
  locations,
  className,
}: {
  defaultVista: Vista;
  defaultDesde: string;
  defaultHasta: string;
  defaultMoneda: string;
  defaultUbicacion: string;
  defaultFlujo: string;
  locations: LocOpt[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = useCallback(
    (p: { vista: Vista; desde: string; hasta: string; moneda: string; ubicacion: string; flujo: string }) => {
      const s = new URLSearchParams();
      if (p.vista !== "efectivo") s.set("vista", p.vista);
      if (p.desde) s.set("desde", p.desde);
      if (p.hasta) s.set("hasta", p.hasta);
      if (p.moneda) s.set("moneda", p.moneda);
      if (p.ubicacion) s.set("ubicacion", p.ubicacion);
      if (p.flujo && p.flujo !== "todos") s.set("flujo", p.flujo);
      s.set("page", "1");
      startTransition(() => router.push(`/tesoreria/transacciones?${s.toString()}`));
    },
    [router],
  );
  return (
    <div className={cn("space-y-3", className)}>
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          apply({
            vista: (String(fd.get("vista") ?? "efectivo")) as Vista,
            desde: String(fd.get("desde") ?? ""),
            hasta: String(fd.get("hasta") ?? ""),
            moneda: String(fd.get("moneda") ?? ""),
            ubicacion: String(fd.get("ubicacion") ?? ""),
            flujo: String(fd.get("flujo") ?? "todos"),
          });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="vista-tr">Vista</Label>
          <select
            id="vista-tr"
            name="vista"
            defaultValue={defaultVista}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          >
            <option value="efectivo">Efectivo (banco + manuales)</option>
            <option value="operativo">Operativo (cobranzas y gastos)</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="desde-tr">Desde</Label>
          <input
            id="desde-tr"
            name="desde"
            type="date"
            defaultValue={defaultDesde}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hasta-tr">Hasta</Label>
          <input
            id="hasta-tr"
            name="hasta"
            type="date"
            defaultValue={defaultHasta}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="moneda-tr">Moneda</Label>
          <select
            id="moneda-tr"
            name="moneda"
            defaultValue={defaultMoneda}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          >
            <option value="">Todas</option>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ubic-tr">Ubicación</Label>
          <select
            id="ubic-tr"
            name="ubicacion"
            defaultValue={defaultUbicacion}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          >
            <option value="">Todas</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.displayName} ({l.currencyCode})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="flujo-tr">Flujo</Label>
          <select
            id="flujo-tr"
            name="flujo"
            defaultValue={defaultFlujo}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          >
            <option value="todos">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
            <option value="interno">Interno</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "…" : "Aplicar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
