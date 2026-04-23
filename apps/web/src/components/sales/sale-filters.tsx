"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { labelSaleStatus, saleStatusesForList } from "@/lib/sales/status";

type Vista = "activas" | "archivadas" | "todas";

type ClientOption = { id: string; displayName: string; legalName: string };

export function SaleFilters({
  defaultQ,
  defaultVista,
  defaultClientId,
  defaultStatus,
  defaultDesde,
  defaultHasta,
  clients,
  className,
}: {
  defaultQ: string;
  defaultVista: Vista;
  defaultClientId: string;
  defaultStatus: string;
  defaultDesde: string;
  defaultHasta: string;
  clients: ClientOption[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (p: {
      q: string;
      vista: Vista;
      clientId: string;
      status: string;
      desde: string;
      hasta: string;
    }) => {
      const sp = new URLSearchParams();
      if (p.q.trim()) sp.set("q", p.q.trim());
      if (p.vista !== "activas") sp.set("vista", p.vista);
      if (p.clientId) sp.set("cliente", p.clientId);
      if (p.status) sp.set("estado", p.status);
      if (p.desde) sp.set("desde", p.desde);
      if (p.hasta) sp.set("hasta", p.hasta);
      sp.set("page", "1");
      startTransition(() => {
        router.push(`/operaciones/ventas?${sp.toString()}`);
      });
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
          const clientId = String(fd.get("cliente") ?? "");
          const status = String(fd.get("estado") ?? "");
          const desde = String(fd.get("desde") ?? "");
          const hasta = String(fd.get("hasta") ?? "");
          apply({ q, vista, clientId, status, desde, hasta });
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
                placeholder="Nº de factura o nombre de cliente…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <select
              name="vista"
              defaultValue={defaultVista}
              className="border-input bg-background ring-offset-background h-9 min-w-[10rem] rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="activas">Solo activas</option>
              <option value="archivadas">Archivadas</option>
              <option value="todas">Todas</option>
            </select>
            <Button type="submit" disabled={pending} size="default" className="w-full sm:w-auto">
              Aplicar
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="grid gap-1.5">
            <Label htmlFor="cliente" className="text-xs">Cliente</Label>
            <select
              id="cliente"
              name="cliente"
              defaultValue={defaultClientId}
              className="border-input bg-background ring-offset-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">(todos)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName || c.legalName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="estado" className="text-xs">Estado operativo</Label>
            <select
              id="estado"
              name="estado"
              defaultValue={defaultStatus}
              className="border-input bg-background ring-offset-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">(cualquiera)</option>
              {saleStatusesForList.map((s) => (
                <option key={s} value={s}>
                  {labelSaleStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="desde" className="text-xs">Factura desde</Label>
            <Input id="desde" name="desde" type="date" defaultValue={defaultDesde} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hasta" className="text-xs">Factura hasta</Label>
            <Input id="hasta" name="hasta" type="date" defaultValue={defaultHasta} />
          </div>
        </div>
      </form>
    </div>
  );
}
