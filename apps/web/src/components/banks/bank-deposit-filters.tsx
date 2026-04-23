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

export function BankDepositFilters({
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
    (p: {
      q: string;
      vista: Vista;
      ccy: string;
      cuenta: string;
      desde: string;
      hasta: string;
    }) => {
      const s = new URLSearchParams();
      if (p.q.trim()) s.set("q", p.q.trim());
      if (p.vista !== "activas") s.set("vista", p.vista);
      if (p.ccy) s.set("moneda", p.ccy);
      if (p.cuenta) s.set("cuenta", p.cuenta);
      if (p.desde) s.set("desde", p.desde);
      if (p.hasta) s.set("hasta", p.hasta);
      s.set("page", "1");
      startTransition(() => router.push(`/bancos/depositos?${s.toString()}`));
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
          const ccy = String(fd.get("moneda") ?? "");
          const cuenta = String(fd.get("cuenta") ?? "");
          const desde = String(fd.get("desde") ?? "");
          const hasta = String(fd.get("hasta") ?? "");
          apply({ q, vista, ccy, cuenta, desde, hasta });
        }}
      >
        <div className="grid gap-2 sm:max-w-2xl">
          <Label htmlFor="q-bank-dep">Buscar</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                id="q-bank-dep"
                name="q"
                defaultValue={defaultQ}
                placeholder="Referencia, nombre de cuenta…"
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
            <Label className="text-xs" htmlFor="cuenta">
              Cuenta
            </Label>
            <select
              id="cuenta"
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
            <Label className="text-xs" htmlFor="moneda-d">
              Moneda
            </Label>
            <select
              id="moneda-d"
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
            <Label className="text-xs" htmlFor="desde-d">
              Desde
            </Label>
            <Input id="desde-d" name="desde" type="date" defaultValue={defaultDesde} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="hasta-d">
              Hasta
            </Label>
            <Input id="hasta-d" name="hasta" type="date" defaultValue={defaultHasta} />
          </div>
        </div>
      </form>
    </div>
  );
}
