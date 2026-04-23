"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Vista = "activas" | "archivadas" | "todas";

export function BankAccountFilters({
  defaultQ,
  defaultVista,
  className,
}: {
  defaultQ: string;
  defaultVista: Vista;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = useCallback(
    (p: { q: string; vista: Vista }) => {
      const s = new URLSearchParams();
      if (p.q.trim()) s.set("q", p.q.trim());
      if (p.vista !== "activas") s.set("vista", p.vista);
      s.set("page", "1");
      startTransition(() => router.push(`/bancos/cuentas?${s.toString()}`));
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
          apply({ q, vista });
        }}
      >
        <div className="grid gap-2 sm:max-w-2xl">
          <Label htmlFor="q-bank-acct">Buscar</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                id="q-bank-acct"
                name="q"
                defaultValue={defaultQ}
                placeholder="Nombre, banco, referencia…"
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
      </form>
    </div>
  );
}
