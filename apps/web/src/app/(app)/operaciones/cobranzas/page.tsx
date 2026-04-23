import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { CollectionFilters } from "@/components/collections/collection-filters";
import { CollectionsTable, type CollectionListRow } from "@/components/collections/collections-table";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listCollections, type ListCollectionsOptions } from "@/lib/collections/data";
import { collectionStatusesForList } from "@/lib/collections/status";
import type { CollectionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cobranzas",
  description: "Cobros e imputaciones a ventas",
};

const PAGE_SIZE = 20;

type Vista = ListCollectionsOptions["visibilidad"];

function parseVista(s: string | string[] | undefined): Vista {
  const v = Array.isArray(s) ? s[0] : s;
  if (v === "archivadas" || v === "todas") return v;
  return "activas";
}

function parseStatus(s: string | string[] | undefined): CollectionStatus | undefined {
  const t = Array.isArray(s) ? s[0] : s;
  if (typeof t !== "string" || t === "") return;
  if ((collectionStatusesForList as readonly string[]).includes(t)) return t as CollectionStatus;
  return;
}

function parsePage(s: string | string[] | undefined): number {
  const t = Array.isArray(s) ? s[0] : s;
  return Math.max(1, parseInt(String(t || "1"), 10) || 1);
}

function parseCcy(s: string | string[] | undefined): "ARS" | "USD" | undefined {
  const t = Array.isArray(s) ? s[0] : s;
  if (t === "ARS" || t === "USD") return t;
  return;
}

export default async function CobranzasListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Cobranzas</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const org = ctx.currentOrganizationId;
  const q = typeof sp.q === "string" ? sp.q : "";
  const vista = parseVista(sp.vista);
  const st = parseStatus(sp.estado);
  const moneda = parseCcy(sp.moneda);
  const dateFrom = typeof sp.desde === "string" && sp.desde ? sp.desde : undefined;
  const dateTo = typeof sp.hasta === "string" && sp.hasta ? sp.hasta : undefined;
  const page = parsePage(sp.page);
  const { items, total, page: p, pageSize } = await listCollections(org, {
    q: q || undefined,
    status: st,
    currencyCode: moneda,
    dateFrom,
    dateTo,
    visibilidad: vista,
    page,
    pageSize: PAGE_SIZE,
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cobranzas</h1>
          <p className="text-muted-foreground text-sm">
            Dinero recibido e imputado a facturas. Depósitos y conciliación: otro módulo.
          </p>
        </div>
        <Button asChild>
          <Link href="/operaciones/cobranzas/nuevo" className="inline-flex">
            <Plus className="h-4 w-4" />
            Registrar cobranza
          </Link>
        </Button>
      </div>
      <CollectionFilters
        defaultQ={q}
        defaultVista={vista}
        defaultEstado={st ?? ""}
        defaultCcy={moneda ?? ""}
        defaultDesde={dateFrom ?? ""}
        defaultHasta={dateTo ?? ""}
      />
      <CollectionsTable
        items={items as CollectionListRow[]}
        total={total}
        page={p}
        pageSize={pageSize}
        searchParams={{
          q: q || undefined,
          vista: vista === "activas" ? undefined : vista,
          estado: st,
          moneda,
          desde: dateFrom,
          hasta: dateTo,
        }}
      />
    </div>
  );
}
