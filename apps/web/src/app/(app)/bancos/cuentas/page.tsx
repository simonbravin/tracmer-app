import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankAccountFilters } from "@/components/banks/bank-account-filters";
import { BankAccountsTable, type BankAccountListRow } from "@/components/banks/bank-accounts-table";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listBankAccounts, type ListBankAccountsOptions } from "@/lib/banks/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cuentas bancarias",
  description: "Cajas bancarias de la organización",
};

const PAGE_SIZE = 20;

type Vista = ListBankAccountsOptions["visibilidad"];

function parseVista(s: string | string[] | undefined): Vista {
  const v = Array.isArray(s) ? s[0] : s;
  if (v === "archivadas" || v === "todas") return v;
  return "activas";
}

function parsePage(s: string | string[] | undefined): number {
  const t = Array.isArray(s) ? s[0] : s;
  return Math.max(1, parseInt(String(t || "1"), 10) || 1);
}

export default async function CuentasBancariasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Cuentas bancarias</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const org = ctx.currentOrganizationId;
  const q = typeof sp.q === "string" ? sp.q : "";
  const vista = parseVista(sp.vista);
  const page = parsePage(sp.page);
  const { items, total, page: p, pageSize } = await listBankAccounts(org, {
    q: q || undefined,
    visibilidad: vista,
    page,
    pageSize: PAGE_SIZE,
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cuentas bancarias</h1>
          <p className="text-muted-foreground text-sm">
            Referencia de cajas para registrar depósitos. Conciliación: otra fase.
          </p>
        </div>
        <Button asChild>
          <Link href="/bancos/cuentas/nueva" className="inline-flex">
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </Link>
        </Button>
      </div>
      <BankAccountFilters defaultQ={q} defaultVista={vista} />
      <BankAccountsTable
        items={items as BankAccountListRow[]}
        total={total}
        page={p}
        pageSize={pageSize}
        searchParams={{ q: q || undefined, vista: vista === "activas" ? undefined : vista }}
      />
    </div>
  );
}
