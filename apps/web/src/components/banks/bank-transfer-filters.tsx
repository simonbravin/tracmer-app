"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Vista = "activas" | "archivadas" | "todas";

type AccountOpt = { id: string; name: string; bankName: string; isActive: boolean };

export function BankTransferFilters({
  defaultQ,
  defaultVista,
  defaultCcy,
  defaultCuenta,
  defaultDesde,
  defaultHasta,
  accounts,
  className,
}: {
  defaultQ: string;
  defaultVista: Vista;
  defaultCcy: string;
  defaultCuenta: string;
  defaultDesde: string;
  defaultHasta: string;
  accounts: AccountOpt[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = useCallback(
    (p: { q: string; vista: Vista; ccy: string; cuenta: string; desde: string; hasta: string }) => {
      const s = new URLSearchParams();
      if (p.q.trim()) s.set("q", p.q.trim());
      if (p.vista !== "activas") s.set("vista", p.vista);
      if (p.ccy) s.set("moneda", p.ccy);
      if (p.cuenta) s.set("cuenta", p.cuenta);
      if (p.desde) s.set("desde", p.desde);
      if (p.hasta) s.set("hasta", p.hasta);
      s.set("page", "1");
      startTransition(() => router.push(`/bancos/transferencias?${s.toString()}`));
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
          apply({
            q: String(fd.get("q") ?? ""),
            vista: (String(fd.get("vista") ?? "activas") as Vista) || "activas",
            ccy: String(fd.get("moneda") ?? ""),
            cuenta: String(fd.get("cuenta") ?? ""),
            desde: String(fd.get("desde") ?? ""),
            hasta: String(fd.get("hasta") ?? ""),
          });
        }}
      >
        <div className="grid gap-2 sm:max-w-2xl">
          <Label htmlFor="q-bank-xfer">Buscar</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                id="q-bank-xfer"
                name="q"
                defaultValue={defaultQ}
                placeholder="Notas, nombre de cuenta…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <select
              name="vista"
              defaultValue={defaultVista}
              className="border-input bg-background ring-offset-background h-9 min-w-[9rem] rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="activas">Solo activos</option>
              <option value="archivadas">Archivados</option>
              <option value="todas">Todos</option>
            </select>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              Aplicar
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="cuenta-x">
              Cuenta (origen o destino)
            </Label>
            <select
              id="cuenta-x"
              name="cuenta"
              defaultValue={defaultCuenta}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="">(cualquiera)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {!a.isActive ? " (inactiva)" : ""} · {a.bankName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="moneda-x">
              Moneda
            </Label>
            <select
              id="moneda-x"
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
            <Label className="text-xs" htmlFor="desde-x">
              Desde
            </Label>
            <Input id="desde-x" name="desde" type="date" defaultValue={defaultDesde} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="hasta-x">
              Hasta
            </Label>
            <Input id="hasta-x" name="hasta" type="date" defaultValue={defaultHasta} />
          </div>
        </div>
      </form>
    </div>
  );
}
