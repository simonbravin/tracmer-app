import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { CurrencyCode } from "@prisma/client";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankDepositFilters } from "@/components/banks/bank-deposit-filters";
import { BankDepositsTable, type BankDepositListRow } from "@/components/banks/bank-deposits-table";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listBankDeposits, listBankAccountsForFilter, type ListBankDepositsOptions } from "@/lib/banks/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Depósitos bancarios",
  description: "Dinero ingresado a cuentas bancarias",
};

const PAGE_SIZE = 20;

type Vista = ListBankDepositsOptions["visibilidad"];

function parseVista(s: string | string[] | undefined): Vista {
  const v = Array.isArray(s) ? s[0] : s;
  if (v === "archivadas" || v === "todas") return v;
  return "activas";
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

export default async function DepositosBancariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Depósitos bancarios</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const org = ctx.currentOrganizationId;
  const q = typeof sp.q === "string" ? sp.q : "";
  const vista = parseVista(sp.vista);
  const moneda = parseCcy(sp.moneda);
  const cuenta = typeof sp.cuenta === "string" && sp.cuenta ? sp.cuenta : undefined;
  const dateFrom = typeof sp.desde === "string" && sp.desde ? sp.desde : undefined;
  const dateTo = typeof sp.hasta === "string" && sp.hasta ? sp.hasta : undefined;
  const page = parsePage(sp.page);
  const [accounts, { items, total, page: p, pageSize }] = await Promise.all([
    listBankAccountsForFilter(org),
    listBankDeposits(org, {
      q: q || undefined,
      visibilidad: vista,
      dateFrom,
      dateTo,
      currencyCode: moneda as CurrencyCode | undefined,
      bankAccountId: cuenta,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Depósitos bancarios</h1>
          <p className="text-muted-foreground text-sm">Ingresos a cuentas. Conciliación con cobranzas: otra fase.</p>
        </div>
        <Button asChild>
          <Link href="/bancos/depositos/nuevo" className="inline-flex">
            <Plus className="h-4 w-4" />
            Nuevo depósito
          </Link>
        </Button>
      </div>
      <BankDepositFilters
        defaultQ={q}
        defaultVista={vista}
        defaultCcy={moneda ?? ""}
        defaultCuenta={cuenta ?? ""}
        defaultDesde={dateFrom ?? ""}
        defaultHasta={dateTo ?? ""}
        accounts={accounts}
      />
      <BankDepositsTable
        items={items as BankDepositListRow[]}
        total={total}
        page={p}
        pageSize={pageSize}
        searchParams={{
          q: q || undefined,
          vista: vista === "activas" ? undefined : vista,
          moneda,
          cuenta,
          desde: dateFrom,
          hasta: dateTo,
        }}
      />
    </div>
  );
}
