import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankAccountFormEdit } from "@/components/banks/bank-account-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getBankAccountById } from "@/lib/banks/data";
import { updateBankAccount, type ActionState } from "@/lib/banks/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Editar cuenta bancaria" };

export default async function EditarCuentaBancariaPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar cuenta</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/cuentas">Volver</Link>
        </Button>
      </div>
    );
  }
  const a = await getBankAccountById(ctx.currentOrganizationId, id);
  if (!a || a.deletedAt) {
    notFound();
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href={`/bancos/cuentas/${a.id}`} className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            {a.name}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar cuenta bancaria</h1>
      </div>
      <BankAccountFormEdit
        backHref={`/bancos/cuentas/${a.id}`}
        formAction={
          updateBankAccount.bind(
            null,
            a.id,
          ) as (a: ActionState | null, f: FormData) => Promise<ActionState>
        }
        defaultValues={{
          name: a.name,
          bankName: a.bankName,
          currencyCode: a.currencyCode,
          accountIdentifierMasked: a.accountIdentifierMasked,
          isActive: a.isActive,
        }}
      />
    </div>
  );
}
