import type { Metadata } from "next";
import Link from "next/link";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { AlertFilters } from "@/components/alerts/alert-filters";
import { AlertsTable } from "@/components/alerts/alerts-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STALE_PENDING_COLLECTION_DAYS } from "@/lib/alerts/constants";
import { AlertsInAppBell } from "@/components/alerts/alerts-in-app-bell";
import { getAlertsBellData, listMergedAlerts } from "@/lib/alerts/data";
import { parseListAlertsQuery } from "@/lib/alerts/validation";
import { getAppRequestContext } from "@/lib/auth/app-context";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alertas operativas",
  description: "Listado y acciones sobre alertas de ventas, cobranzas y conciliaciones",
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function buildHref(sp: URLSearchParams, nextPage: number) {
  const n = new URLSearchParams(sp.toString());
  n.set("page", String(nextPage));
  return `/alertas?${n.toString()}`;
}

export default async function AlertasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw: Record<string, string | string[] | undefined> = { ...sp };
  const parsed = parseListAlertsQuery(raw);
  const q = parsed.data;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Alertas operativas</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const [bell, { items, total, page, pageSize }] = await Promise.all([
    getAlertsBellData(orgId, 5),
    listMergedAlerts(orgId, q),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const qs = new URLSearchParams();
  if (q.q) qs.set("q", q.q);
  if (q.tipo && q.tipo !== "all") qs.set("tipo", q.tipo);
  if (q.estado && q.estado !== "all") qs.set("estado", q.estado);
  if (q.severidad && q.severidad !== "all") qs.set("severidad", q.severidad);
  if (q.desde) qs.set("desde", q.desde);
  if (q.hasta) qs.set("hasta", q.hasta);
  if (q.pageSize !== 20) qs.set("pageSize", String(q.pageSize));

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Alertas operativas</h1>
        <p className="text-muted-foreground text-sm max-w-3xl">
          Centro de trabajo: mismas alertas que ves en la campana del encabezado. Condiciones derivadas de ventas,
          cobranzas y conciliaciones. Las acciones <strong>reconocer</strong> y <strong>cerrar</strong> se guardan en la
          base (tabla <code className="text-xs">alerts</code>); al cerrar, la fila deja de mostrarse aunque el dato aún
          pida atención — podés reabrirla más adelante vía producto. Umbral &quot;no conciliada&quot; antigua:{" "}
          {STALE_PENDING_COLLECTION_DAYS} días.
        </p>
        <p className="text-muted-foreground mt-2 text-sm max-w-3xl">
          Para <strong>correo de resumen</strong>, destinatarios y <strong>registro de actividad</strong> (auditoría de
          cambios en esta área), usá{" "}
          <Link href="/configuracion/alertas" className="text-primary underline-offset-4 hover:underline">
            Configuración → Alertas y notificaciones
          </Link>
          .
        </p>
        {!parsed.ok && <p className="text-destructive mt-1 text-sm">Filtros ajustados a valores seguros.</p>}
        </div>
        <div className="shrink-0 self-start sm:pt-1">
          <AlertsInAppBell openCount={bell.openCount} items={bell.preview} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Por fecha se filtra el hecho relevante (vencimiento, cobranza, cierre, etc.). Estado &quot;cerradas&quot; lista
            solo registro en historial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertFilters
            key={JSON.stringify(q)}
            defaults={q}
          />
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-sm">
        {total} resultado{total !== 1 ? "s" : ""} — página {page} de {totalPages}
      </div>
      <AlertsTable items={items} />
      <div className="flex items-center justify-between gap-2">
        {hasPrev ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={buildHref(qs, page - 1)}>Anterior</Link>
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Inicio</span>
        )}
        {hasNext ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={buildHref(qs, page + 1)}>Siguiente</Link>
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Fin</span>
        )}
      </div>
    </div>
  );
}
