import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { SaleFilters } from "@/components/sales/sale-filters";
import { SalesTable, type SaleListRow } from "@/components/sales/sales-table";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listActiveClients, listSales, type ListSalesOptions } from "@/lib/sales/data";
import { saleStatusesForList } from "@/lib/sales/status";
import type { SaleStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ventas",
  description: "Facturación y ventas (sin cobranzas todavía)",
};

const PAGE_SIZE = 20;

type Vista = ListSalesOptions["visibilidad"];

function parseVista(s: string | string[] | undefined): Vista {
  const v = Array.isArray(s) ? s[0] : s;
  if (v === "archivadas" || v === "todas") return v;
  return "activas";
}

function parseStatus(s: string | string[] | undefined): SaleStatus | undefined {
  const t = Array.isArray(s) ? s[0] : s;
  if (typeof t !== "string" || t === "") return;
  if ((saleStatusesForList as readonly string[]).includes(t)) return t as SaleStatus;
  return;
}

function parsePage(s: string | string[] | undefined): number {
  const t = Array.isArray(s) ? s[0] : s;
  return Math.max(1, parseInt(String(t || "1"), 10) || 1);
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const q = typeof sp.q === "string" ? sp.q : "";
  const vista = parseVista(sp.vista);
  const st = parseStatus(sp.estado);
  const clientIdFilter =
    typeof sp.cliente === "string" && sp.cliente.trim() !== "" ? sp.cliente.trim() : undefined;
  const dateFrom = typeof sp.desde === "string" && sp.desde ? sp.desde : undefined;
  const dateTo = typeof sp.hasta === "string" && sp.hasta ? sp.hasta : undefined;
  const page = parsePage(sp.page);
  const { items, total, page: p, pageSize } = await listSales(orgId, {
    q: q || undefined,
    clientId: clientIdFilter,
    status: st,
    dateFrom,
    dateTo,
    visibilidad: vista,
    page,
    pageSize: PAGE_SIZE,
  });
  const clientOptions = await listActiveClients(orgId);
  const defaultDesde = dateFrom ?? "";
  const defaultHasta = dateTo ?? "";
  const defaultClientId = clientIdFilter ?? "";
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground text-sm">
            Facturación, vencimiento e importes. Cobranzas: otro módulo.
          </p>
        </div>
        <Button asChild>
          <Link href="/operaciones/ventas/nuevo" className="inline-flex">
            <Plus className="h-4 w-4" />
            Registrar venta
          </Link>
        </Button>
      </div>
      <SaleFilters
        defaultQ={q}
        defaultVista={vista}
        defaultClientId={defaultClientId}
        defaultStatus={st ?? ""}
        defaultDesde={defaultDesde}
        defaultHasta={defaultHasta}
        clients={clientOptions}
      />
      <SalesTable
        items={items as SaleListRow[]}
        total={total}
        page={p}
        pageSize={pageSize}
        searchParams={{
          q: q || undefined,
          vista: vista === "activas" ? undefined : vista,
          cliente: clientIdFilter,
          estado: st,
          desde: dateFrom,
          hasta: dateTo,
        }}
      />
    </div>
  );
}
