import type { Metadata } from "next";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { PageHeader } from "@/components/common/page-header";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import {
  DashboardAlertsHeaderAction,
  DashboardAlertsProvider,
} from "@/components/dashboard/dashboard-alerts-context";
import { DashboardAlertsBanner } from "@/components/dashboard/dashboard-alerts-banner";
import {
  ClientRanksTable,
  CobranzasNoDepTable,
  ConcTable,
  VentasVencidasTable,
} from "@/components/dashboard/dashboard-lists";
import { countOpenActiveHighSeverity } from "@/lib/alerts/data";
import { getDashboardData } from "@/lib/dashboard/data";
import { getDashboardDailySeriesArs } from "@/lib/dashboard/series";
import { parseDashboardSearchParams, resolveDateRange } from "@/lib/dashboard/validation";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listActiveClients } from "@/lib/sales/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tablero",
  description: "KPIs y señal operativa",
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TableroPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="max-w-6xl space-y-6">
        <PageHeader title="Tablero" description="KPIs y señal operativa." />
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const parsed = parseDashboardSearchParams(sp);
  const d = parsed.data;
  const range = parsed.range;
  const rResolved = resolveDateRange(d.periodo, d.desde, d.hasta);
  const [data, clients, alertSummary, dailySeries] = await Promise.all([
    getDashboardData({ orgId, range, query: d }),
    listActiveClients(orgId),
    countOpenActiveHighSeverity(orgId),
    getDashboardDailySeriesArs({
      orgId,
      range,
      clientId: d.cliente?.trim() ? d.cliente : null,
    }),
  ]);
  const topFactArs = data.topFacturacion.filter((r) => r.currencyCode === "ARS");
  const topFactUsd = data.topFacturacion.filter((r) => r.currencyCode === "USD");
  const topPendArs = data.topPendiente.filter((r) => r.currencyCode === "ARS");
  const topPendUsd = data.topPendiente.filter((r) => r.currencyCode === "USD");
  const topClientsArs = topFactArs.slice(0, 8).map((r) => ({
    name: r.name.length > 22 ? `${r.name.slice(0, 22)}…` : r.name,
    amount: Number(r.amount),
  }));

  return (
    <div className="max-w-6xl space-y-8">
      <DashboardAlertsProvider openHighCount={alertSummary.count}>
        <div>
          <PageHeader
            title="Tablero"
            description="Resumen por período, moneda, y criterio documental (misma lógica que los módulos vinculados)."
            actions={<DashboardAlertsHeaderAction />}
          />
          <div className="mt-2">
            <DashboardAlertsBanner />
          </div>
          {!parsed.ok && (
            <p className="text-destructive mt-1 text-sm">
              Parámetros de búsqueda ajustados al mes en curso: revisá rango &quot;personalizado&quot; (ambas fechas).
            </p>
          )}
        </div>
      </DashboardAlertsProvider>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Preset, cliente y búsqueda acotan listados; ver leyenda en KPIs.</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardFilters
            key={`${d.periodo}-${range.desde}-${range.hasta}-${d.cliente ?? ""}`}
            defaultPeriodo={d.periodo}
            defaultDesde={d.desde ?? rResolved.desde}
            defaultHasta={d.hasta ?? rResolved.hasta}
            defaultCliente={d.cliente ?? ""}
            defaultQ={d.q ?? ""}
            rangeDesde={range.desde}
            rangeHasta={range.hasta}
            clients={clients}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Indicadores</h2>
        <Separator />
        <DashboardKpis data={data.kpis} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Gráficos</h2>
        <Separator />
        <DashboardCharts daily={dailySeries} topClientsArs={topClientsArs} />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Listas</h2>
        <Separator />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Ventas vencidas (saldo &gt; 0)</CardTitle>
              <CardDescription>Por vencimiento de plazo, misma lógica que módulo ventas.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <VentasVencidasTable rows={data.ventasVencidas} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Cobranzas con pendiente a conciliación</CardTitle>
              <CardDescription>
                Sobre el rango de fechas; saldo aún no aplicado a un depósito bajo cierres y borradores activos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <CobranzasNoDepTable rows={data.cobranzasNoDep} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Conciliaciones cerradas en el período</CardTitle>
            <CardDescription>Orden por fecha/hora de cierre.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <ConcTable rows={data.concRecientes} />
          </CardContent>
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Clientes: mayor facturación</CardTitle>
              <CardDescription>Rango = fecha de emisión, ventas con estado de facturación (no draft/cancelled).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <ClientRanksTable label="Pesos (ARS)" rows={topFactArs} />
              <ClientRanksTable label="Dólares (USD)" rows={topFactUsd} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Clientes: mayor pendiente de cobro</CardTitle>
              <CardDescription>Saldo según imputaciones validadas, ventas abiertas en el rango (factura).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <ClientRanksTable label="Pesos (ARS)" rows={topPendArs} />
              <ClientRanksTable label="Dólares (USD)" rows={topPendUsd} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
