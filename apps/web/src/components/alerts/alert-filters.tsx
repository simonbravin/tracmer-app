"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  ALERT_SEVERITY_CRITICAL,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_LOW,
  ALERT_SEVERITY_MEDIUM,
  ALERT_TYPE_COLLECTION_NOT_DEPOSITED,
  ALERT_TYPE_INCONSISTENCY,
  ALERT_TYPE_INVOICE_OVERDUE,
  labelAlertType,
  labelSeverity,
} from "@/lib/alerts/constants";
import type { ListAlertsQuery } from "@/lib/alerts/validation";

export function AlertFilters({
  defaults,
  className,
}: {
  defaults: ListAlertsQuery;
  className?: string;
}) {
  const router = useRouter();
  const [pend, go] = useTransition();

  const apply = useCallback(
    (p: ListAlertsQuery) => {
      const s = new URLSearchParams();
      if (p.q) s.set("q", p.q);
      if (p.tipo && p.tipo !== "all") s.set("tipo", p.tipo);
      if (p.estado && p.estado !== "all") s.set("estado", p.estado);
      if (p.severidad && p.severidad !== "all") s.set("severidad", p.severidad);
      if (p.desde) s.set("desde", p.desde);
      if (p.hasta) s.set("hasta", p.hasta);
      s.set("page", String(p.page ?? 1));
      s.set("pageSize", String(p.pageSize));
      go(() => router.push(`/alertas?${s.toString()}`));
    },
    [router],
  );

  return (
    <form
      className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        apply({
          q: (String(fd.get("q") || "").trim() || undefined) as string | undefined,
          tipo: (String(fd.get("tipo") || "all") as ListAlertsQuery["tipo"]) ?? "all",
          estado: (String(fd.get("estado") || "all") as ListAlertsQuery["estado"]) ?? "all",
          severidad: (String(fd.get("severidad") || "all") as ListAlertsQuery["severidad"]) ?? "all",
          desde: String(fd.get("desde") || "") || undefined,
          hasta: String(fd.get("hasta") || "") || undefined,
          page: 1,
          pageSize: defaults.pageSize,
        } as ListAlertsQuery);
      }}
    >
      <div className="md:col-span-2">
        <Label className="text-xs">Búsqueda</Label>
        <Input name="q" defaultValue={defaults.q ?? ""} placeholder="Título, tipo, id entidad…" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Tipo</Label>
        <select
          name="tipo"
          defaultValue={defaults.tipo}
          className="border-input bg-background ring-offset-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="all">(todos)</option>
          <option value={ALERT_TYPE_INVOICE_OVERDUE}>{labelAlertType(ALERT_TYPE_INVOICE_OVERDUE)}</option>
          <option value={ALERT_TYPE_COLLECTION_NOT_DEPOSITED}>
            {labelAlertType(ALERT_TYPE_COLLECTION_NOT_DEPOSITED)}
          </option>
          <option value={ALERT_TYPE_INCONSISTENCY}>{labelAlertType(ALERT_TYPE_INCONSISTENCY)}</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Estado</Label>
        <select
          name="estado"
          defaultValue={defaults.estado}
          className="border-input bg-background ring-offset-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="all">Todas (listado activo, no cerradas en sistema)</option>
          <option value="open">Solo abiertas</option>
          <option value="acknowledged">Solo reconocidas</option>
          <option value="closed">Solo cerradas (histórico en BD)</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Severidad</Label>
        <select
          name="severidad"
          defaultValue={defaults.severidad}
          className="border-input bg-background ring-offset-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="all">(todas)</option>
          <option value={ALERT_SEVERITY_LOW}>{labelSeverity(ALERT_SEVERITY_LOW)}</option>
          <option value={ALERT_SEVERITY_MEDIUM}>{labelSeverity(ALERT_SEVERITY_MEDIUM)}</option>
          <option value={ALERT_SEVERITY_HIGH}>{labelSeverity(ALERT_SEVERITY_HIGH)}</option>
          <option value={ALERT_SEVERITY_CRITICAL}>{labelSeverity(ALERT_SEVERITY_CRITICAL)}</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Desde</Label>
        <Input name="desde" type="date" defaultValue={defaults.desde ?? ""} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Hasta</Label>
        <Input name="hasta" type="date" defaultValue={defaults.hasta ?? ""} className="mt-1" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pend}>
          Aplicar
        </Button>
      </div>
    </form>
  );
}
