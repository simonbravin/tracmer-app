import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { SaleStatus } from "@prisma/client";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ArchiveSaleButton } from "@/components/sales/archive-sale-button";
import { CancelSaleButton } from "@/components/sales/cancel-sale-button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getSaleById } from "@/lib/sales/data";
import {
  dateTimeAr,
  describeOperationalStatus,
  formatDueDate,
  formatMoney,
  formatMoneyPlain,
  isPastDue,
  shortDateArUtc,
} from "@/lib/sales/format";
import { labelSaleStatus } from "@/lib/sales/status";
import { formatTaxId } from "@/lib/clients/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function invoiceRefLabel(
  n: string | null | undefined,
  c: { displayName: string; legalName: string } | null,
) {
  const t = n?.trim();
  if (t) return `Factura Nº ${t}`;
  if (c) return `Venta a ${c.displayName || c.legalName}`;
  return "Venta (sin nº aún)";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) return { title: "Venta" };
  const s = await getSaleById(ctx.currentOrganizationId, id);
  if (!s) return { title: "Venta" };
  const title = s.invoiceNumber?.trim() ? s.invoiceNumber : `Venta ${s.id.slice(0, 8)}`;
  return { title };
}

export default async function VentaDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Venta</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/operaciones/ventas">Volver a ventas</Link>
        </Button>
      </div>
    );
  }
  const s = await getSaleById(ctx.currentOrganizationId, id);
  if (!s) notFound();
  const archived = s.deletedAt != null;
  const canEdit = !archived && s.status !== SaleStatus.collected;
  const canArchive = !archived;
  const canCancel =
    !archived &&
    s.status !== SaleStatus.collected &&
    s.status !== SaleStatus.cancelled;
  const vence = formatDueDate(s.invoiceDate, s.creditDays);
  const atraso =
    s.status === SaleStatus.issued && isPastDue(s.invoiceDate, s.creditDays) ? (
      <Badge className="mt-1" variant="secondary">
        Al día de hoy la fecha de cálculo venció (sin cobro registrado acá)
      </Badge>
    ) : null;
  const opStatus = describeOperationalStatus(s.status, s.allocationCount > 0);
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
          <Link href="/operaciones/ventas" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Ventas
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">
              {s.invoiceNumber?.trim() || "Venta (sin nº de factura)"}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {s.client
                ? `${s.client.displayName || s.client.legalName} · CUIT: ${formatTaxId(s.client.taxId)}`
                : "Sin cliente (dato inconsistente: revisá o reportá un bug)."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {archived ? <Badge variant="secondary">Archivada</Badge> : null}
              <Badge variant="outline" className="text-left font-normal">
                {opStatus}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={`/operaciones/ventas/${s.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
            {canCancel ? (
              <CancelSaleButton
                saleId={s.id}
                invoiceRef={invoiceRefLabel(s.invoiceNumber, s.client)}
              />
            ) : null}
            {canArchive ? (
              <ArchiveSaleButton
                saleId={s.id}
                label={invoiceRefLabel(s.invoiceNumber, s.client)}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Importes y moneda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">{formatMoney(s.totalAmount, s.currencyCode)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Equivalencia ARS (a emisión): </span>
              {s.amountArsEquivalentAtIssue
                ? `${formatMoneyPlain(s.amountArsEquivalentAtIssue)} ARS`
                : "— (sin dato)"}
            </p>
            {s.currencyCode === "USD" && s.fxRateArsPerUnitUsdAtIssue ? (
              <p>
                <span className="text-muted-foreground">Tasa en emisión (ARS/USD): </span>
                {s.fxRateArsPerUnitUsdAtIssue.toString()}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              {s.currencyCode === "ARS"
                ? "En ARS, el importe y la equivalencia coinciden."
                : "En USD, se guarda la tasa y el equivalente en ARS; cobranza real en módulo Cobranzas."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fechas y vencimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Emisión (factura): </span>
              {shortDateArUtc(s.invoiceDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Vencimiento (emisión + {s.creditDays} d.): </span>
              {vence}
            </p>
            {atraso}
            <p className="text-muted-foreground text-xs">
              {s.status === "partially_collected" || s.status === "collected"
                ? s.allocationCount > 0
                  ? "Hay cobros asignados: importes reales viven en Cobranzas."
                  : `El estado en sistema es “${labelSaleStatus(s.status)}” pero no figuran imputaciones en la base. Cuando haya módulo Cobranzas, se vincularán.`
                : "Estado operativo según carga, sin cobro automático vinculado a esta pantalla."}
            </p>
          </CardContent>
        </Card>
      </div>
      <p className="text-muted-foreground text-sm">
        Creado {dateTimeAr(s.createdAt)} · Últ. cambio {dateTimeAr(s.updatedAt)} · id interna{" "}
        <code className="text-xs">{s.id}</code>
      </p>
    </div>
  );
}
