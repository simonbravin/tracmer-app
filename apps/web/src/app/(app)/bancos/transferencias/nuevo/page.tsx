import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankTransferFormCreate } from "@/components/banks/bank-transfer-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { createBankTransfer } from "@/lib/banks/actions";
import { listBankAccountsForTransferForm } from "@/lib/banks/data";
import { todayYmdUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nueva transferencia" };

export default async function NuevaTransferenciaPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva transferencia</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/transferencias">Volver</Link>
        </Button>
      </div>
    );
  }
  const accounts = await listBankAccountsForTransferForm(ctx.currentOrganizationId);
  const canPair = accounts.some((from) =>
    accounts.some((to) => to.id !== from.id && to.currencyCode === from.currencyCode),
  );
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/transferencias" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Transferencias
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva transferencia</h1>
        <p className="text-muted-foreground text-sm">
          Elegí cuenta origen y destino (misma moneda), fecha y monto. Comisión opcional.
        </p>
      </div>
      {accounts.length < 2 || !canPair ? (
        <p className="text-muted-foreground text-sm">
          Necesitás al menos dos cuentas activas y al menos dos con la misma moneda (ARS o USD).{" "}
          <Link className="underline" href="/bancos/cuentas/nueva">
            Crear cuenta
          </Link>
        </p>
      ) : (
        <BankTransferFormCreate
          formAction={createBankTransfer}
          accounts={accounts}
          defaultTransferDate={todayYmdUtc()}
        />
      )}
    </div>
  );
}
