"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/sales/format";

import type { DashboardDailyPoint } from "@/lib/dashboard/series";

export type TopClientBarPoint = { name: string; amount: number };

function shortAxisDate(iso: string) {
  return iso.slice(5);
}

function formatAxisMoney(n: number) {
  if (!Number.isFinite(n)) return "";
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

/** Altura fija para Recharts: evita width/height -1 en grid (min-width:auto) y primer paint. */
const CHART_HEIGHT_PX = 280;

function DashboardChartsInner({
  daily,
  topClientsArs,
}: {
  daily: DashboardDailyPoint[];
  topClientsArs: TopClientBarPoint[];
}) {
  const hasLine = useMemo(
    () => daily.some((d) => d.facturado > 0 || d.cobrado > 0 || d.depositado > 0),
    [daily],
  );
  const hasBar = topClientsArs.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="ui-interactive-lift min-w-0 rounded-lg border border-border bg-card p-4 shadow-surface">
        <h3 className="text-sm font-medium">Evolución diaria (ARS)</h3>
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          Facturado, cobrado bruto y depositado por día. Con cliente seleccionado, la serie de facturado respeta el
          filtro; cobranza y depósitos siguen a nivel organización.
        </p>
        <div className="h-[280px] w-full min-h-[220px] min-w-0">
          {!hasLine ? (
            <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Sin movimientos ARS en el rango para graficar.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
              <LineChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={shortAxisDate} tick={{ fontSize: 11 }} />
                <YAxis width={44} tick={{ fontSize: 11 }} tickFormatter={formatAxisMoney} />
                <Tooltip
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value);
                    const safe = Number.isFinite(n) ? n : 0;
                    return [formatMoney(safe, "ARS"), String(name)];
                  }}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="facturado"
                  name="Facturado"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cobrado"
                  name="Cobrado bruto"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="depositado"
                  name="Depositado"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="ui-interactive-lift min-w-0 rounded-lg border border-border bg-card p-4 shadow-surface">
        <h3 className="text-sm font-medium">Ranking clientes — facturación (ARS)</h3>
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          Top del período según fecha de emisión (misma regla que la tabla de ranking).
        </p>
        <div className="h-[280px] w-full min-h-[220px] min-w-0">
          {!hasBar ? (
            <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Sin clientes con facturación ARS en el rango.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
              <BarChart
                data={topClientsArs}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatAxisMoney} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={112}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <Tooltip
                  formatter={(value) => {
                    const n = typeof value === "number" ? value : Number(value);
                    const safe = Number.isFinite(n) ? n : 0;
                    return formatMoney(safe, "ARS");
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="amount" name="Facturado" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export const DashboardCharts = memo(DashboardChartsInner);
