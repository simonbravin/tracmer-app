import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankAccountFormCreate } from "@/components/banks/bank-account-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { createBankAccount } from "@/lib/banks/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nueva cuenta bancaria" };

export default async function NuevaCuentaBancariaPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva cuenta</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/cuentas">Volver</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/cuentas" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Cuentas bancarias
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva cuenta bancaria</h1>
        <p className="text-muted-foreground text-sm">Nombre, banco, moneda y referencia visible.</p>
      </div>
      <BankAccountFormCreate formAction={createBankAccount} />
    </div>
  );
}
