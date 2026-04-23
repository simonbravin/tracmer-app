import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ReconciliationStatus } from "@prisma/client";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ReconciliationFilters } from "@/components/reconciliations/reconciliation-filters";
import { ReconciliationsTable, type ReconciliationListRow } from "@/components/reconciliations/reconciliations-table";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listReconciliations, type ListReconciliationsOptions } from "@/lib/reconciliations/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conciliaciones",
  description: "Cobranzas y depósitos bancarios",
};

const PAGE_SIZE = 20;

const STATUSES: ReconciliationStatus[] = ["draft", "closed", "voided"];

type Vista = ListReconciliationsOptions["visibilidad"];

function parseVista(s: string | string[] | undefined): Vista {
  const v = Array.isArray(s) ? s[0] : s;
  if (v === "archivadas" || v === "todas") return v;
  return "activas";
}

function parsePage(s: string | string[] | undefined): number {
  const t = Array.isArray(s) ? s[0] : s;
  return Math.max(1, parseInt(String(t || "1"), 10) || 1);
}

function parseEstado(s: string | string[] | undefined): ReconciliationStatus | undefined {
  const t = Array.isArray(s) ? s[0] : s;
  if (t === "all" || t === "" || t == null) {
    return;
  }
  if (typeof t === "string" && (STATUSES as string[]).includes(t)) {
    return t as ReconciliationStatus;
  }
  return;
}

export default async function ConciliacionesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Conciliaciones</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const org = ctx.currentOrganizationId;
  const q = typeof sp.q === "string" ? sp.q : "";
  const vista = parseVista(sp.vista);
  const st = parseEstado(sp.estado);
  const dateFrom = typeof sp.desde === "string" && sp.desde ? sp.desde : undefined;
  const dateTo = typeof sp.hasta === "string" && sp.hasta ? sp.hasta : undefined;
  const page = parsePage(sp.page);
  const { items, total, page: p, pageSize } = await listReconciliations(org, {
    q: q || undefined,
    visibilidad: vista,
    status: st,
    dateFrom,
    dateTo,
    page,
    pageSize: PAGE_SIZE,
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conciliaciones</h1>
          <p className="text-muted-foreground text-sm">
            Asignación de cobranzas a depósitos, con cierre, diferencias y anulación segura.
          </p>
        </div>
        <Button asChild>
          <Link href="/bancos/conciliaciones/nueva" className="inline-flex">
            <Plus className="h-4 w-4" />
            Nueva conciliación
          </Link>
        </Button>
      </div>
      <ReconciliationFilters
        defaultQ={q}
        defaultVista={vista}
        defaultEstado={st ?? "all"}
        defaultDesde={dateFrom ?? ""}
        defaultHasta={dateTo ?? ""}
      />
      <ReconciliationsTable
        items={items as ReconciliationListRow[]}
        total={total}
        page={p}
        pageSize={pageSize}
        searchParams={{
          q: q || undefined,
          vista: vista === "activas" ? undefined : vista,
          estado: st ?? (typeof sp.estado === "string" && sp.estado ? sp.estado : "all"),
          desde: dateFrom,
          hasta: dateTo,
        }}
      />
    </div>
  );
}
