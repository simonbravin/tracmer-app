"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_FEED_RANGE_DAYS } from "@/lib/treasury/validation";
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
  defaultOrden,
  locations,
  className,
}: {
  defaultVista: Vista;
  defaultDesde: string;
  defaultHasta: string;
  defaultMoneda: string;
  defaultUbicacion: string;
  defaultFlujo: string;
  defaultOrden: "asc" | "desc";
  locations: LocOpt[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (p: {
      vista: Vista;
      desde: string;
      hasta: string;
      moneda: string;
      ubicacion: string;
      flujo: string;
      orden: "asc" | "desc";
    }) => {
      const s = new URLSearchParams();
      if (p.vista !== "efectivo") s.set("vista", p.vista);
      if (p.desde) s.set("desde", p.desde);
      if (p.hasta) s.set("hasta", p.hasta);
      if (p.moneda) s.set("moneda", p.moneda);
      if (p.ubicacion) s.set("ubicacion", p.ubicacion);
      if (p.flujo && p.flujo !== "todos") s.set("flujo", p.flujo);
      if (p.orden !== "desc") s.set("orden", p.orden);
      s.set("page", "1");
      startTransition(() => router.push(`/tesoreria/transacciones?${s.toString()}`));
    },
    [router],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-muted-foreground text-xs">
        Rango máximo {MAX_FEED_RANGE_DAYS} días. Vista operativo no filtra por ubicación (cobranza aún no imputa caja hasta
        conciliar o depositar).
      </p>
      <form
        className="space-y-3"
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
            orden: (String(fd.get("orden") ?? "desc")) as "asc" | "desc",
          });
        }}
      >
        <div className="grid gap-2 sm:max-w-2xl">
          <Label htmlFor="vista-tr" className="text-xs">
            Vista
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <select
              id="vista-tr"
              name="vista"
              defaultValue={defaultVista}
              className="border-input bg-background ring-offset-background h-9 min-w-[12rem] rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="efectivo">Efectivo (banco + manuales)</option>
              <option value="operativo">Operativo (cobranzas y gastos)</option>
            </select>
            <input type="hidden" name="orden" value={defaultOrden} />
            <Button type="submit" disabled={pending} size="default" className="w-full sm:w-auto">
              {pending ? "…" : "Aplicar"}
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="grid gap-1.5">
            <Label htmlFor="desde-tr" className="text-xs">
              Desde
            </Label>
            <Input id="desde-tr" name="desde" type="date" defaultValue={defaultDesde} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hasta-tr" className="text-xs">
              Hasta
            </Label>
            <Input id="hasta-tr" name="hasta" type="date" defaultValue={defaultHasta} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="moneda-tr" className="text-xs">
              Moneda
            </Label>
            <select
              id="moneda-tr"
              name="moneda"
              defaultValue={defaultMoneda}
              className="border-input bg-background ring-offset-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">Todas</option>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ubic-tr" className="text-xs">
              Ubicación
            </Label>
            <select
              id="ubic-tr"
              name="ubicacion"
              defaultValue={defaultUbicacion}
              className="border-input bg-background ring-offset-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">Todas</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.displayName} ({l.currencyCode})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="flujo-tr" className="text-xs">
              Flujo
            </Label>
            <select
              id="flujo-tr"
              name="flujo"
              defaultValue={defaultFlujo}
              className="border-input bg-background ring-offset-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="todos">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="interno">Interno</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
}
