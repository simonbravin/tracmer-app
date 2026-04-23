import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankDepositFormEdit } from "@/components/banks/bank-deposit-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getBankDepositById, listBankAccountsForDepositForm } from "@/lib/banks/data";
import { updateBankDeposit, type ActionState } from "@/lib/banks/actions";
import { dateToYmdUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Editar depósito" };

export default async function EditarDepositoPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar depósito</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/depositos">Volver</Link>
        </Button>
      </div>
    );
  }
  const d = await getBankDepositById(ctx.currentOrganizationId, id);
  if (!d || d.deletedAt) {
    notFound();
  }
  const accounts = await listBankAccountsForDepositForm(ctx.currentOrganizationId, d.bankAccountId);
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href={`/bancos/depositos/${d.id}`} className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Depósito
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar depósito</h1>
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay cuentas bancarias disponibles para asignar.</p>
      ) : (
        <BankDepositFormEdit
          backHref={`/bancos/depositos/${d.id}`}
          accounts={accounts}
          formAction={
            updateBankDeposit.bind(
              null,
              d.id,
            ) as (a: ActionState | null, f: FormData) => Promise<ActionState>
          }
          defaultValues={{
            bankAccountId: d.bankAccountId,
            depositDate: dateToYmdUtc(d.depositDate),
            amount: d.amount.toString(),
            currencyCode: d.currencyCode,
            reference: d.reference ?? "",
            fxRateArsPerUnitUsdAtDeposit: d.fxRateArsPerUnitUsdAtDeposit?.toString() ?? "",
          }}
        />
      )}
    </div>
  );
}
