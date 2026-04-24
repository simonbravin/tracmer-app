import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { BankTransferFormEdit } from "@/components/banks/bank-transfer-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getBankTransferById, listBankAccountsForTransferForm } from "@/lib/banks/data";
import { updateBankTransfer, type ActionState } from "@/lib/banks/actions";
import { dateToYmdUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Editar transferencia" };

export default async function EditarTransferenciaPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar transferencia</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/transferencias">Volver</Link>
        </Button>
      </div>
    );
  }
  const t = await getBankTransferById(ctx.currentOrganizationId, id);
  if (!t || t.deletedAt) {
    notFound();
  }
  const accounts = await listBankAccountsForTransferForm(ctx.currentOrganizationId, {
    ensureFromId: t.fromBankAccountId,
    ensureToId: t.toBankAccountId,
  });
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href={`/bancos/transferencias/${t.id}`} className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Transferencia
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar transferencia</h1>
      </div>
      {accounts.length < 2 ? (
        <p className="text-muted-foreground text-sm">No hay cuentas bancarias disponibles.</p>
      ) : (
        <BankTransferFormEdit
          backHref={`/bancos/transferencias/${t.id}`}
          accounts={accounts}
          formAction={
            updateBankTransfer.bind(null, t.id) as (a: ActionState | null, f: FormData) => Promise<ActionState>
          }
          defaultValues={{
            fromBankAccountId: t.fromBankAccountId,
            toBankAccountId: t.toBankAccountId,
            transferDate: dateToYmdUtc(t.transferDate),
            amount: t.amount.toString(),
            feeAmount: t.feeAmount?.toString() ?? "",
            notes: t.notes ?? "",
          }}
        />
      )}
    </div>
  );
}
