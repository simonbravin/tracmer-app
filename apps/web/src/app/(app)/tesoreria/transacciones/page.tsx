import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsFilters } from "@/components/treasury/transactions-filters";
import { TransactionsTable } from "@/components/treasury/transactions-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";
import { listTreasuryLocationsForOrg } from "@/lib/treasury/data";
import { listTransactionFeed } from "@/lib/treasury/transactions-feed";
import { transactionFeedQuerySchema } from "@/lib/treasury/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transacciones",
  description: "Movimientos de tesorería y operativo",
};

function single(sp: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = sp[k];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="max-w-6xl space-y-4">
        <PageHeader title="Transacciones" description="Movimientos unificados." />
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership.role;
  const canView = await hasPermission(orgId, role.id, role.code, P.treasury.view);
  if (!canView) {
    return (
      <div className="max-w-6xl space-y-4">
        <PageHeader title="Transacciones" description="Movimientos unificados." />
        <p className="text-muted-foreground text-sm">No tenés permiso para ver tesorería.</p>
      </div>
    );
  }

  const rawQ = {
    vista: single(sp, "vista"),
    desde: single(sp, "desde"),
    hasta: single(sp, "hasta"),
    moneda: single(sp, "moneda"),
    ubicacion: single(sp, "ubicacion"),
    flujo: single(sp, "flujo"),
    page: single(sp, "page"),
    pageSize: single(sp, "pageSize"),
  };
  const parsed = transactionFeedQuerySchema.safeParse(rawQ);
  const q = parsed.success ? parsed.data : transactionFeedQuerySchema.parse({});

  const [feed, locations] = await Promise.all([
    listTransactionFeed(orgId, q),
    listTreasuryLocationsForOrg(orgId),
  ]);

  const locOpts = locations.map((l) => ({
    id: l.id,
    displayName: l.displayName,
    kind: l.kind,
    currencyCode: l.currencyCode,
  }));

  const canCreate = await hasPermission(orgId, role.id, role.code, P.treasury.create);

  const desde = q.desde ?? "";
  const hasta = q.hasta ?? "";

  const searchParamsForTable = {
    vista: q.vista,
    desde: desde || undefined,
    hasta: hasta || undefined,
    moneda: q.moneda,
    ubicacion: q.ubicacion,
    flujo: q.flujo,
  };

  if (!feed.ok) {
    return (
      <div className="max-w-6xl space-y-6">
        <PageHeader title="Transacciones" description="Movimientos unificados." />
        <p className="text-destructive text-sm">{feed.error}</p>
        <TransactionsFilters
          defaultVista={q.vista}
          defaultDesde={desde}
          defaultHasta={hasta}
          defaultMoneda={q.moneda ?? ""}
          defaultUbicacion={q.ubicacion ?? ""}
          defaultFlujo={q.flujo}
          locations={locOpts}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <PageHeader
          title="Transacciones"
          description="Vista efectivo (caja y banco) u operativo (cobranzas y gastos). Sin duplicar montos en base: lectura compuesta."
        />
        {canCreate ? (
          <Button asChild variant="outline">
            <Link href="/tesoreria/movimientos/nuevo" className="inline-flex">
              <Plus className="h-4 w-4" />
              Movimiento manual
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Rango máximo 366 días. Vista operativo no filtra por ubicación (cobranza aún no imputa caja hasta
            conciliar/depositar).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsFilters
            defaultVista={q.vista}
            defaultDesde={feed.range.desde}
            defaultHasta={feed.range.hasta}
            defaultMoneda={q.moneda ?? ""}
            defaultUbicacion={q.ubicacion ?? ""}
            defaultFlujo={q.flujo}
            locations={locOpts}
          />
        </CardContent>
      </Card>

      <TransactionsTable
        rows={feed.rows}
        total={feed.total}
        page={feed.page}
        pageSize={feed.pageSize}
        range={feed.range}
        searchParams={searchParamsForTable}
      />
    </div>
  );
}
