"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, createReportSchedule, updateReportSchedule } from "@/lib/reports/scheduled/actions";
import {
  type CreateScheduleForm,
  type UpdateScheduleForm,
} from "@/lib/reports/scheduled/validation";
import { reportKeys, reportLabels, type ReportKey } from "@/lib/reports/types";
import { defaultDateRangeYmd } from "@/lib/reports/validation";
import { labelSaleStatus, saleStatusesForList } from "@/lib/sales/status";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Asuncion",
  "America/Santiago",
  "UTC",
] as const;

const DOW: { v: number; l: string }[] = [
  { v: 0, l: "Domingo" },
  { v: 1, l: "Lunes" },
  { v: 2, l: "Martes" },
  { v: 3, l: "Miércoles" },
  { v: 4, l: "Jueves" },
  { v: 5, l: "Viernes" },
  { v: 6, l: "Sábado" },
];

const FR_LABEL: Record<"daily" | "weekly" | "monthly", string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

type BankAcc = { id: string; label: string };
type ClientOpt = { id: string; displayName: string };

type Props = {
  mode: "create" | "edit";
  scheduleId?: string;
  clients: ClientOpt[];
  bankAccounts: BankAcc[];
  defaultValues: Partial<CreateScheduleForm> & { scheduleId?: string };
};

function buildParameters(
  reportType: ReportKey,
  format: "xlsx" | "pdf",
  s: {
    dr: { desde: string; hasta: string };
    visibilidad: "activas" | "archivadas" | "todas";
    clientId: string;
    moneda: "" | "ARS" | "USD";
    estado: string;
    bankAccountId: string;
    concStatus: string;
    porFecha: "created" | "closed";
    q: string;
  },
): CreateScheduleForm["parameters"] {
  if (reportType === "ventas") {
    return {
      report: "ventas",
      format,
      filter: {
        desde: s.dr.desde,
        hasta: s.dr.hasta,
        visibilidad: s.visibilidad,
        clientId: s.clientId || undefined,
        moneda: s.moneda || undefined,
        estado: s.estado ? (s.estado as (typeof saleStatusesForList)[number]) : undefined,
      },
    };
  }
  if (reportType === "cobranzas") {
    return {
      report: "cobranzas",
      format,
      filter: {
        desde: s.dr.desde,
        hasta: s.dr.hasta,
        visibilidad: s.visibilidad,
        clientId: s.clientId || undefined,
        moneda: s.moneda || undefined,
      },
    };
  }
  if (reportType === "depositos") {
    return {
      report: "depositos",
      format,
      filter: {
        desde: s.dr.desde,
        hasta: s.dr.hasta,
        visibilidad: s.visibilidad,
        bankAccountId: s.bankAccountId || undefined,
        moneda: s.moneda || undefined,
      },
    };
  }
  if (reportType === "conciliaciones") {
    return {
      report: "conciliaciones",
      format,
      filter: {
        desde: s.dr.desde,
        hasta: s.dr.hasta,
        visibilidad: s.visibilidad,
        status: s.concStatus
          ? (s.concStatus as "draft" | "closed" | "voided")
          : undefined,
        porFecha: s.porFecha,
      },
    };
  }
  return {
    report: "clientes",
    format,
    filter: { q: s.q || undefined },
  };
}

export function ScheduleForm({ mode, scheduleId, clients, bankAccounts, defaultValues }: Props) {
  const dr = defaultDateRangeYmd();
  const r = useRouter();
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(defaultValues.name ?? "");
  const [reportType, setReportType] = useState<ReportKey>(defaultValues.reportType ?? "ventas");
  const [format, setFormat] = useState<"xlsx" | "pdf">(defaultValues.parameters?.format ?? "xlsx");
  const [timezone, setTimezone] = useState(defaultValues.timezone ?? "America/Argentina/Buenos_Aires");
  const [isActive, setIsActive] = useState(defaultValues.isActive ?? true);

  const p = defaultValues.parameters;
  const sch = defaultValues.schedule;

  const [desde, setDesde] = useState(
    p && p.report !== "clientes" ? p.filter.desde : dr.desde,
  );
  const [hasta, setHasta] = useState(
    p && p.report !== "clientes" ? p.filter.hasta : dr.hasta,
  );
  const [visibilidad, setVisibilidad] = useState<"activas" | "archivadas" | "todas">(
    p && p.report !== "clientes" ? p.filter.visibilidad : "activas",
  );
  const [clientId, setClientId] = useState(
    p && (p.report === "ventas" || p.report === "cobranzas") && "clientId" in p.filter
      ? p.filter.clientId ?? ""
      : "",
  );
  const [moneda, setMoneda] = useState<"" | "ARS" | "USD">(
    p &&
      (p.report === "ventas" || p.report === "cobranzas" || p.report === "depositos") &&
      "moneda" in p.filter
      ? (p.filter as { moneda?: "ARS" | "USD" }).moneda ?? ""
      : "",
  );
  const [estado, setEstado] = useState(
    p && p.report === "ventas" && "estado" in p.filter && p.filter.estado ? p.filter.estado : "",
  );
  const [bankAccountId, setBankAccountId] = useState(
    p && p.report === "depositos" && "bankAccountId" in p.filter ? p.filter.bankAccountId ?? "" : "",
  );
  const [concStatus, setConcStatus] = useState(
    p && p.report === "conciliaciones" && "status" in p.filter && p.filter.status ? p.filter.status : "",
  );
  const [porFecha, setPorFecha] = useState<"created" | "closed">(
    p && p.report === "conciliaciones" && "porFecha" in p.filter
      ? p.filter.porFecha
      : "closed",
  );
  const [q, setQ] = useState(
    p && p.report === "clientes" && "q" in p.filter && p.filter.q != null
      ? p.filter.q
      : "",
  );

  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(sch?.frequency ?? "daily");
  const [time, setTime] = useState(sch?.time ?? "08:00");
  const [dayOfWeek, setDayOfWeek] = useState(sch?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(sch?.dayOfMonth ?? 1);
  const [emails, setEmails] = useState(
    defaultValues.recipientEmails ? defaultValues.recipientEmails.join("\n") : "",
  );

  const isDateReport = reportType !== "clientes";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const recipientEmails = emails
      .split(/[\n,;]+/g)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    const s = {
      dr: { desde, hasta },
      visibilidad,
      clientId,
      moneda,
      estado,
      bankAccountId,
      concStatus,
      porFecha,
      q,
    };
    const base: CreateScheduleForm = {
      name: name.trim(),
      reportType,
      timezone,
      isActive,
      parameters: buildParameters(reportType, format, s),
      schedule: {
        frequency,
        time,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      },
      recipientEmails,
    };
    if (base.schedule.frequency === "monthly" && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 28)) {
      setErr("Día del mes: entre 1 y 28");
      return;
    }
    start(() => {
      (async () => {
        let res: ActionState;
        if (mode === "create") {
          res = await createReportSchedule(base);
        } else {
          if (!scheduleId) {
            setErr("Falta el id");
            return;
          }
          const upd: UpdateScheduleForm = { ...base, scheduleId };
          res = await updateReportSchedule(upd);
        }
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        r.push("/reportes/programados");
        r.refresh();
      })();
    });
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      {err ? <p className="text-destructive text-sm">{err}</p> : null}
      <div>
        <Label htmlFor="name">Nombre de la entrega</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        <p className="text-muted-foreground text-xs">Aparece en el asunto del email.</p>
      </div>
      <div>
        <Label>Reporte</Label>
        <select
          className={cn(
            "mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm",
            "shadow-sm focus-visible:ring-1 focus-visible:ring-ring",
          )}
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportKey)}
        >
          {reportKeys.map((k) => (
            <option key={k} value={k}>
              {reportLabels[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Formato del archivo</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={format}
          onChange={(e) => setFormat(e.target.value as "xlsx" | "pdf")}
        >
          <option value="xlsx">Excel (xlsx)</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      {isDateReport ? (
        <div className="space-y-3 rounded-md border p-4">
          <p className="text-sm font-medium">Filtro de fechas (relativo a cada envío; conviene el mes o trimestre actual)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
            </div>
            <div>
              <Label>Visibilidad (ventas, cobros, depósitos, conciliación)</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={visibilidad}
                onChange={(e) =>
                  setVisibilidad(e.target.value as "activas" | "archivadas" | "todas")
                }
              >
                <option value="activas">Solo activas</option>
                <option value="archivadas">Solo archivadas</option>
                <option value="todas">Todas</option>
              </select>
            </div>
            {(reportType === "ventas" || reportType === "cobranzas") && (
              <div>
                <Label>Cliente (opcional)</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Todos</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {reportType === "ventas" && (
              <div>
                <Label>Estado venta</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option value="">(cualquiera)</option>
                  {saleStatusesForList.map((st) => (
                    <option key={st} value={st}>
                      {labelSaleStatus(st)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(reportType === "ventas" || reportType === "cobranzas" || reportType === "depositos") && (
              <div>
                <Label>Moneda (opcional)</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={moneda}
                  onChange={(e) => setMoneda((e.target.value as "" | "ARS" | "USD") || "")}
                >
                  <option value="">(todas)</option>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            )}
            {reportType === "depositos" && (
              <div>
                <Label>Cuenta bancaria (opcional)</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  <option value="">Todas</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {reportType === "conciliaciones" && (
              <>
                <div>
                  <Label>Estado conciliación (opcional)</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    value={concStatus}
                    onChange={(e) => setConcStatus(e.target.value)}
                  >
                    <option value="">(cualquiera)</option>
                    <option value="draft">Borrador</option>
                    <option value="closed">Cerrada</option>
                    <option value="voided">Anulada</option>
                  </select>
                </div>
                <div>
                  <Label>Filtrar fechas por</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    value={porFecha}
                    onChange={(e) => setPorFecha(e.target.value as "created" | "closed")}
                  >
                    <option value="closed">Cierre</option>
                    <option value="created">Creación</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="q">Buscar (opcional)</Label>
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, razón social o CUIT"
            maxLength={200}
          />
        </div>
      )}
      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-medium">Frecuencia y hora</p>
        <div>
          <Label>Repetir</Label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "daily" | "weekly" | "monthly")}
          >
            <option value="daily">{FR_LABEL.daily}</option>
            <option value="weekly">{FR_LABEL.weekly}</option>
            <option value="monthly">{FR_LABEL.monthly}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="time">Hora local (24 h)</Label>
          <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        {frequency === "weekly" && (
          <div>
            <Label>Día</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
            >
              {DOW.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.l}
                </option>
              ))}
            </select>
          </div>
        )}
        {frequency === "monthly" && (
          <div>
            <Label htmlFor="dom">Día del mes (1-28)</Label>
            <Input
              id="dom"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
            />
          </div>
        )}
        <div>
          <Label>Zona horaria</Label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="active" className="!mt-0 font-normal">
            Programación activa
          </Label>
        </div>
      </div>
      <div>
        <Label htmlFor="emails">Destinatarios (un email por línea o separados por coma)</Label>
        <Textarea
          id="emails"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          className="min-h-[100px] font-mono text-sm"
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : mode === "create" ? "Crear programación" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
