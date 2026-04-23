"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { labelReconciliationStatus } from "@/lib/reconciliations/reconciliation-status";
import { cn } from "@/lib/utils";
import type { ReconciliationStatus } from "@prisma/client";

const LIST = ["draft", "closed", "voided"] as const satisfies ReconciliationStatus[];

type Vista = "activas" | "archivadas" | "todas";

export function ReconciliationFilters({
  defaultQ,
  defaultVista,
  defaultEstado,
  defaultDesde,
  defaultHasta,
  className,
}: {
  defaultQ: string;
  defaultVista: Vista;
  defaultEstado: ReconciliationStatus | "" | "all";
  defaultDesde: string;
  defaultHasta: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = useCallback(
    (p: { q: string; vista: Vista; estado: string; desde: string; hasta: string }) => {
      const s = new URLSearchParams();
      if (p.q.trim()) s.set("q", p.q.trim());
      if (p.vista !== "activas") s.set("vista", p.vista);
      if (p.estado && p.estado !== "" && p.estado !== "all") s.set("estado", p.estado);
      if (p.desde) s.set("desde", p.desde);
      if (p.hasta) s.set("hasta", p.hasta);
      s.set("page", "1");
      startTransition(() => router.push(`/bancos/conciliaciones?${s.toString()}`));
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
          const estado = String(fd.get("estado") ?? "all");
          const desde = String(fd.get("desde") ?? "");
          const hasta = String(fd.get("hasta") ?? "");
          apply({ q, vista, estado, desde, hasta });
        }}
      >
        <div className="grid gap-2 sm:max-w-2xl">
          <Label htmlFor="q-rec">Buscar</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                id="q-rec"
                name="q"
                defaultValue={defaultQ}
                placeholder="Id, notas…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <select
              name="vista"
              defaultValue={defaultVista}
              className="border-input bg-background ring-offset-background h-9 min-w-[9rem] rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="activas">No archivadas</option>
              <option value="archivadas">Solo archivadas</option>
              <option value="todas">Todas</option>
            </select>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              Aplicar
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="estado-rec">Estado</Label>
            <select
              id="estado-rec"
              name="estado"
              defaultValue={defaultEstado || "all"}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="all">(cualquiera)</option>
              {LIST.map((st) => (
                <option key={st} value={st}>
                  {labelReconciliationStatus(st as ReconciliationStatus)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="desde-r">
              Creada desde
            </Label>
            <Input id="desde-r" name="desde" type="date" defaultValue={defaultDesde} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="hasta-r">
              Creada hasta
            </Label>
            <Input id="hasta-r" name="hasta" type="date" defaultValue={defaultHasta} />
          </div>
        </div>
      </form>
    </div>
  );
}
