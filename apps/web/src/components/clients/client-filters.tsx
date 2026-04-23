"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Estado = "activos" | "archivados" | "todos";

export function ClientFilters({
  defaultQ,
  defaultEstado,
  className,
}: {
  defaultQ: string;
  defaultEstado: Estado;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (q: string, estado: Estado) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (estado !== "activos") p.set("estado", estado);
      p.set("page", "1");
      startTransition(() => {
        router.push(`/clientes?${p.toString()}`);
      });
    },
    [router],
  );

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end", className)}>
      <form
        className="flex min-w-0 flex-1 flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = String(fd.get("q") ?? "");
          const estado = (String(fd.get("estado") ?? "activos") as Estado) || "activos";
          apply(q, estado);
        }}
      >
        <div className="grid gap-2 sm:max-w-md">
          <Label htmlFor="q">Buscar</Label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                id="q"
                name="q"
                defaultValue={defaultQ}
                placeholder="Razón social, nombre o CUIT…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <select
              name="estado"
              defaultValue={defaultEstado}
              className="border-input bg-background ring-offset-background h-9 rounded-md border px-2 text-sm shadow-sm"
            >
              <option value="activos">Activos</option>
              <option value="archivados">Archivados</option>
              <option value="todos">Todos</option>
            </select>
            <Button type="submit" disabled={pending} size="default">
              Filtrar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
