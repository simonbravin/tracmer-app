import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Prisma } from "@prisma/client";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ArchiveCollectionButton } from "@/components/collections/archive-collection-button";
import { VoidCollectionForm } from "@/components/collections/void-collection-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getCollectionById, invoiceDateBoundsFromAllocations } from "@/lib/collections/data";
import { voidCollection, type ActionState } from "@/lib/collections/actions";
import { feeAmountInCollectionCurrency } from "@/lib/collections/amounts";
import { labelCollectionStatus } from "@/lib/collections/status";
import {
  dateTimeAr,
  formatFxArsPerUsd,
  formatMoney,
  formatMoneyPlain,
  shortDateArUtc,
  shortInvoiceDateRangeArUtc,
} from "@/lib/sales/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CollectionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) return { title: "Cobranza" };
  const c = await getCollectionById(ctx.currentOrganizationId, id);
  if (!c) return { title: "Cobranza" };
  return { title: `Cobranza ${shortDateArUtc(c.collectionDate)}` };
}

export default async function CobranzaDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Cobranza</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const c = await getCollectionById(ctx.currentOrganizationId, id);
  if (!c) notFound();
  const archived = c.deletedAt != null;
  const isVoid = c.status === CollectionStatus.voided;
  const canEdit = !archived && !isVoid;
  const canArchive = !archived;
  const canVoid = !archived && !isVoid;
  const sumAlloc = c.allocations.reduce(
    (s, a) => s.add(new Prisma.Decimal(a.amountInCollectionCurrency.toString())),
    new Prisma.Decimal(0),
  );
  let sumFeeCol = new Prisma.Decimal(0);
  for (const f of c.fees) {
    sumFeeCol = sumFeeCol.add(
      feeAmountInCollectionCurrency(
        new Prisma.Decimal(f.amount.toString()),
        new Prisma.Decimal(f.fxRateToCollectionCurrency.toString()),
      ),
    );
  }
  const gross = new Prisma.Decimal(c.grossAmount.toString());
  const unallocated = gross.minus(sumAlloc);
  const net = gross.minus(sumFeeCol);
  const invBounds = invoiceDateBoundsFromAllocations(c.allocations);
  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
        <Link href="/operaciones/cobranzas" className="text-sm">
          <ChevronLeft className="h-4 w-4" />
          Cobranzas
        </Link>
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Cobranza del {shortDateArUtc(c.collectionDate)}</h1>
          <p className="text-muted-foreground text-sm">id {c.id}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {archived ? <Badge variant="secondary">Archivada</Badge> : null}
            {isVoid && !archived ? <Badge variant="destructive">{labelCollectionStatus("voided")}</Badge> : null}
            {c.status === "valid" && !archived ? <Badge variant="outline">{labelCollectionStatus("valid")}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button asChild>
              <Link href={`/operaciones/cobranzas/${c.id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          ) : null}
          {canArchive ? <ArchiveCollectionButton collectionId={c.id} label="Cobranza" /> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Importes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Fecha de cobro: </span>
              {shortDateArUtc(c.collectionDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Fecha(s) de factura (imputaciones): </span>
              {shortInvoiceDateRangeArUtc(invBounds.earliest, invBounds.latest)}
            </p>
            <p>
              <span className="text-muted-foreground">Tipo de cambio (ARS por USD): </span>
              {c.currencyCode === "USD"
                ? `${formatFxArsPerUsd(c.fxRateArsPerUnitUsdAtCollection)} ARS/USD`
                : "—"}
            </p>
            {(c.checkNumber?.trim() || c.checkBankLabel?.trim()) ? (
              <p>
                <span className="text-muted-foreground">Cheque / banco: </span>
                {[c.checkNumber?.trim(), c.checkBankLabel?.trim()].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Bruto: </span>
              {formatMoney(c.grossAmount, c.currencyCode)}
            </p>
            <p>
              <span className="text-muted-foreground">Importe en pesos (registrado): </span>
              {formatMoney(
                c.amountArsEquivalent ?? (c.currencyCode === "ARS" ? c.grossAmount : null),
                "ARS",
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Imputado: </span>
              {formatMoneyPlain(sumAlloc)} {c.currencyCode} · <span className="text-muted-foreground">Pend. sin asignar a facturas: </span>
              {formatMoneyPlain(unallocated)} {c.currencyCode}
            </p>
            <Separator className="my-2" />
            <p>
              <span className="text-muted-foreground">Gastos (en moneda de cobranza, suma): </span>
              {formatMoneyPlain(sumFeeCol)} {c.currencyCode}
            </p>
            <p className="font-medium">
              <span className="text-muted-foreground font-normal">Neto: </span>
              {formatMoneyPlain(net)} {c.currencyCode}
            </p>
            <p className="text-muted-foreground text-xs">Neto = bruto − total de gastos (convertido con tasa de cada gasto).</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Imputaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {c.allocations.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin imputaciones.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venta</TableHead>
                    <TableHead>Fecha factura</TableHead>
                    <TableHead>En mon. cobranza</TableHead>
                    <TableHead>Tasa / venta</TableHead>
                    <TableHead>En mon. venta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.allocations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.sale
                          ? `${a.sale.client ? (a.sale.client.displayName || a.sale.client.legalName) : "—"} — ${a.sale.invoiceNumber?.trim() || a.sale.id.slice(0, 8)}`
                          : a.saleId}
                        <p className="text-muted-foreground text-xs">Estado: {a.sale?.status}</p>
                        <p className="pt-0.5">
                          <Button variant="link" asChild className="h-auto p-0 text-xs">
                            <Link href={`/operaciones/ventas/${a.saleId}`}>Ver factura</Link>
                          </Button>
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                        {a.sale?.invoiceDate ? shortDateArUtc(a.sale.invoiceDate) : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoneyPlain(a.amountInCollectionCurrency)} {c.currencyCode}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.fxRateToSaleCurrency.toString()}</TableCell>
                      <TableCell className="tabular-nums">
                        {a.sale ? formatMoney(a.amountInSaleCurrency, a.sale.currencyCode) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {c.fees.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin gastos.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Tasa → cobr.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.fees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.description}</TableCell>
                      <TableCell>
                        {formatMoney(f.amount, f.currencyCode)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{f.fxRateToCollectionCurrency.toString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {c.notes ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Notas: </span>
          {c.notes}
        </p>
      ) : null}
      {isVoid && c.voidReason ? (
        <p className="text-sm text-destructive">
          <span className="text-muted-foreground not-italic">Anulada: </span>
          {c.voidReason}
        </p>
      ) : null}
      {canVoid ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anular cobranza</CardTitle>
          </CardHeader>
          <CardContent>
            <VoidCollectionForm
              formAction={
                voidCollection.bind(
                  null,
                  c.id,
                ) as (a: ActionState | null, f: FormData) => Promise<ActionState>
              }
            />
          </CardContent>
        </Card>
      ) : null}
      <p className="text-muted-foreground text-sm">
        Alta {dateTimeAr(c.createdAt)} · act. {dateTimeAr(c.updatedAt)}
      </p>
    </div>
  );
}
