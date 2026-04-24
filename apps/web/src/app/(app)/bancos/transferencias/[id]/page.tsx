import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ArchiveBankTransferButton } from "@/components/banks/archive-bank-transfer-button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getBankTransferById } from "@/lib/banks/data";
import { dateTimeAr, formatMoney, shortDateArUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) return { title: "Transferencia" };
  const t = await getBankTransferById(ctx.currentOrganizationId, id);
  if (!t) return { title: "Transferencia" };
  return { title: `Transferencia ${shortDateArUtc(t.transferDate)}` };
}

export default async function TransferenciaDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Transferencia</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/transferencias">Volver</Link>
        </Button>
      </div>
    );
  }
  const t = await getBankTransferById(ctx.currentOrganizationId, id);
  if (!t) notFound();
  const archived = t.deletedAt != null;
  const canEdit = !archived;
  const label = `Transferencia ${shortDateArUtc(t.transferDate)} · ${formatMoney(t.amount, t.currencyCode)}`;
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/transferencias" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Transferencias
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{formatMoney(t.amount, t.currencyCode)}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {shortDateArUtc(t.transferDate)} · {t.fromAccount.name} → {t.toAccount.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">{archived ? <Badge variant="secondary">Archivado</Badge> : null}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={`/bancos/transferencias/${t.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
            {canEdit ? <ArchiveBankTransferButton transferId={t.id} shortLabel={label} /> : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Origen: </span>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/bancos/cuentas/${t.fromBankAccountId}`}>
                {t.fromAccount.name} — {t.fromAccount.bankName}
              </Link>
            </Button>{" "}
            <span className="text-muted-foreground">({t.fromAccount.currencyCode})</span>
          </p>
          <p>
            <span className="text-muted-foreground">Destino: </span>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/bancos/cuentas/${t.toBankAccountId}`}>
                {t.toAccount.name} — {t.toAccount.bankName}
              </Link>
            </Button>{" "}
            <span className="text-muted-foreground">({t.toAccount.currencyCode})</span>
          </p>
          <p>
            <span className="text-muted-foreground">Moneda: </span>
            {t.currencyCode}
          </p>
          <p>
            <span className="text-muted-foreground">Monto: </span>
            {formatMoney(t.amount, t.currencyCode)}
          </p>
          <p>
            <span className="text-muted-foreground">Comisión: </span>
            {t.feeAmount != null && Number(t.feeAmount.toString()) > 0
              ? formatMoney(t.feeAmount, t.currencyCode)
              : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Notas: </span>
            {t.notes?.trim() ? t.notes : "—"}
          </p>
          <p className="text-muted-foreground">
            Creado {dateTimeAr(t.createdAt)} · Última modificación {dateTimeAr(t.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
