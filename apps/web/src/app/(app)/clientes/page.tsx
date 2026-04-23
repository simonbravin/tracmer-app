import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { PageHeader } from "@/components/common/page-header";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientsTable, type ClientRow } from "@/components/clients/clients-table";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listClients } from "@/lib/clients/data";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes",
  description: "Cartera de clientes",
};

const PAGE_SIZE = 20;

type Estado = "activos" | "archivados" | "todos";

function parseEstado(s: string | string[] | undefined): Estado {
  if (s === "archivados" || s === "todos") return s;
  return "activos";
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Clientes"
          description="Cartera de clientes."
          breadcrumbs={[{ label: "Inicio", href: "/tablero" }, { label: "Clientes" }]}
        />
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const mRole = ctx.primaryMembership?.role;
  const canCreateClient =
    mRole != null ? await hasPermission(orgId, mRole.id, mRole.code, P.clients.create) : false;
  const q = typeof sp.q === "string" ? sp.q : "";
  const estado = parseEstado(sp.estado);
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const { items, total, page: p } = await listClients(orgId, {
    q,
    estado,
    page,
    pageSize: PAGE_SIZE,
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Razones sociales y CUIT. Ventas: módulo aparte."
        breadcrumbs={[{ label: "Inicio", href: "/tablero" }, { label: "Clientes" }]}
        actions={
          canCreateClient ? (
            <Button asChild>
              <Link href="/clientes/nuevo" className="inline-flex">
                <Plus className="h-4 w-4" />
                Nuevo cliente
              </Link>
            </Button>
          ) : null
        }
      />
      <ClientFilters
        defaultQ={q}
        defaultEstado={estado}
      />
      <ClientsTable
        items={items as ClientRow[]}
        total={total}
        page={p}
        pageSize={PAGE_SIZE}
        searchParams={{ q: q || undefined, estado }}
      />
    </div>
  );
}
