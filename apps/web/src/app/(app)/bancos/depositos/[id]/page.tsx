import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ArchiveBankDepositButton } from "@/components/banks/archive-bank-deposit-button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getBankDepositById } from "@/lib/banks/data";
import { dateTimeAr, formatMoney, formatMoneyPlain, shortDateArUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) return { title: "Depósito" };
  const d = await getBankDepositById(ctx.currentOrganizationId, id);
  if (!d) return { title: "Depósito" };
  return { title: `Depósito ${shortDateArUtc(d.depositDate)}` };
}

export default async function DepositoDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Depósito</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/depositos">Volver</Link>
        </Button>
      </div>
    );
  }
  const d = await getBankDepositById(ctx.currentOrganizationId, id);
  if (!d) notFound();
  const archived = d.deletedAt != null;
  const canEdit = !archived;
  const label = `Depósito del ${shortDateArUtc(d.depositDate)} · ${formatMoney(d.amount, d.currencyCode)}`;
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/depositos" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Depósitos
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{formatMoney(d.amount, d.currencyCode)}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {shortDateArUtc(d.depositDate)} · {d.bankAccount.name} ({d.bankAccount.bankName})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">{archived ? <Badge variant="secondary">Archivado</Badge> : null}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={`/bancos/depositos/${d.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
            {canEdit ? <ArchiveBankDepositButton depositId={d.id} shortLabel={label} /> : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Cuenta: </span>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/bancos/cuentas/${d.bankAccountId}`}>
                {d.bankAccount.name} — {d.bankAccount.bankName}
              </Link>
            </Button>
            {" "}
            <span className="text-muted-foreground">({d.bankAccount.currencyCode})</span>
          </p>
          <p>
            <span className="text-muted-foreground">Moneda del depósito: </span>
            {d.currencyCode}
          </p>
          <p>
            <span className="text-muted-foreground">Monto: </span>
            {formatMoney(d.amount, d.currencyCode)}
          </p>
          {d.currencyCode === "USD" && d.fxRateArsPerUnitUsdAtDeposit ? (
            <p>
              <span className="text-muted-foreground">Tasa (ARS/USD) en la fecha: </span>
              {formatMoneyPlain(d.fxRateArsPerUnitUsdAtDeposit)}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Equiv. ARS: </span>
            {d.amountArsEquivalent != null
              ? `${formatMoneyPlain(d.amountArsEquivalent)} ARS`
              : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Referencia: </span>
            {d.reference?.trim() ? d.reference : "—"}
          </p>
          <p className="text-muted-foreground">
            Creado {dateTimeAr(d.createdAt)} · Última modificación {dateTimeAr(d.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
