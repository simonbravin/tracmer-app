import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankDepositFormCreate } from "@/components/banks/bank-deposit-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { createBankDeposit } from "@/lib/banks/actions";
import { listBankAccountsForDepositForm } from "@/lib/banks/data";
import { todayYmdUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nuevo depósito" };

export default async function NuevoDepositoPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nuevo depósito</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/depositos">Volver</Link>
        </Button>
      </div>
    );
  }
  const accounts = await listBankAccountsForDepositForm(ctx.currentOrganizationId);
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/depositos" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Depósitos
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo depósito bancario</h1>
        <p className="text-muted-foreground text-sm">
          Fecha, monto, moneda y, si aplica, tasa para equivalente en ARS.
        </p>
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Necesitás al menos una cuenta bancaria activa.{" "}
          <Link className="underline" href="/bancos/cuentas/nueva">
            Crear cuenta
          </Link>
        </p>
      ) : (
        <BankDepositFormCreate
          formAction={createBankDeposit}
          accounts={accounts}
          defaultDepositDate={todayYmdUtc()}
        />
      )}
    </div>
  );
}
