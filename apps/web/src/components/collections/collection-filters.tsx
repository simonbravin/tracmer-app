"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { labelCollectionStatus, collectionStatusesForList } from "@/lib/collections/status";
import type { CollectionStatus } from "@prisma/client";

type Vista = "activas" | "archivadas" | "todas";

export function CollectionFilters({
  defaultQ,
  defaultVista,
  defaultEstado,
  defaultCcy,
  defaultDesde,
  defaultHasta,
  className,
}: {
  defaultQ: string;
  defaultVista: Vista;
  defaultEstado: string;
  defaultCcy: string;
  defaultDesde: string;
  defaultHasta: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = useCallback(
    (p: { q: string; vista: Vista; estado: string; ccy: string; desde: string; hasta: string }) => {
      const s = new URLSearchParams();
      if (p.q.trim()) s.set("q", p.q.trim());
      if (p.vista !== "activas") s.set("vista", p.vista);
      if (p.estado) s.set("estado", p.estado);
      if (p.ccy) s.set("moneda", p.ccy);
      if (p.desde) s.set("desde", p.desde);
      if (p.hasta) s.set("hasta", p.hasta);
      s.set("page", "1");
      startTransition(() => router.push(`/operaciones/cobranzas?${s.toString()}`));
    },
    [router],
  );
  return (
    <div className={cn("space-y-3", className)}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = String(fd.get("q") ?? "");
          const vista = (String(fd.get("vista") ?? "activas") as Vista) || "activas";
          const estado = String(fd.get("estado") ?? "");
          const ccy = String(fd.get("moneda") ?? "");
          const desde = String(fd.get("desde") ?? "");
          const hasta = String(fd.get("hasta") ?? "");
          apply({ q, vista, estado, ccy, desde, hasta });
        }}
      >
        <div className="grid gap-2 sm:max-w-2xl">
          <Label htmlFor="q">Buscar</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                id="q"
                name="q"
                defaultValue={defaultQ}
                placeholder="Método, notas…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <select
              name="vista"
              defaultValue={defaultVista}
              className="border-input bg-background ring-offset-background h-9 min-w-[9rem] rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="activas">Solo activas</option>
              <option value="archivadas">Archivadas</option>
              <option value="todas">Todas</option>
            </select>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              Aplicar
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="estado">Estado</Label>
            <select
              id="estado"
              name="estado"
              defaultValue={defaultEstado}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">(cualquiera)</option>
              {collectionStatusesForList.map((st) => (
                <option key={st} value={st}>
                  {labelCollectionStatus(st as CollectionStatus)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="moneda">Moneda</Label>
            <select
              id="moneda"
              name="moneda"
              defaultValue={defaultCcy}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">(cualquiera)</option>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="desde">Desde</Label>
            <Input id="desde" name="desde" type="date" defaultValue={defaultDesde} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="hasta">Hasta</Label>
            <Input id="hasta" name="hasta" type="date" defaultValue={defaultHasta} />
          </div>
        </div>
      </form>
    </div>
  );
}
