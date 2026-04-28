import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableSurface } from "@/components/ui/data-table-surface";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { labelCollectionStatus } from "@/lib/collections/status";
import {
  shortDateArUtc,
  formatMoney,
  formatFxArsPerUsd,
  shortInvoiceDateRangeArUtc,
} from "@/lib/sales/format";
import type { CollectionStatus, CurrencyCode } from "@prisma/client";

export type CollectionListRow = {
  id: string;
  grossAmount: { toString(): string };
  currencyCode: CurrencyCode;
  collectionDate: Date;
  status: CollectionStatus;
  voidedAt: Date | null;
  paymentMethodCode: string | null;
  fxRateArsPerUnitUsdAtCollection: { toString(): string } | null;
  amountArsEquivalent: { toString(): string } | null;
  earliestInvoiceDate: Date | null;
  latestInvoiceDate: Date | null;
  checkNumber: string | null;
  checkBankLabel: string | null;
  deletedAt: Date | null;
  _count: { allocations: number };
};

type SearchP = {
  q?: string;
  vista?: string;
  estado?: string;
  moneda?: string;
  desde?: string;
  hasta?: string;
};

function listHref(p: { page: number; base: SearchP }) {
  const s = new URLSearchParams();
  if (p.base.q) s.set("q", p.base.q);
  if (p.base.vista && p.base.vista !== "activas") s.set("vista", p.base.vista);
  if (p.base.estado) s.set("estado", p.base.estado);
  if (p.base.moneda) s.set("moneda", p.base.moneda);
  if (p.base.desde) s.set("desde", p.base.desde);
  if (p.base.hasta) s.set("hasta", p.base.hasta);
  s.set("page", String(p.page));
  return `/operaciones/cobranzas?${s.toString()}`;
}

export function CollectionsTable({
  items,
  total,
  page,
  pageSize,
  searchParams,
}: {
  items: CollectionListRow[];
  total: number;
  page: number;
  pageSize: number;
  searchParams: SearchP;
}) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm">
        {searchParams.q
          ? "No hay resultados. Probá otros criterios."
          : "No hay cobranzas. Podés registrar la primera (con ventas emitidas para imputar)."}
      </div>
    );
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < pages;
  return (
    <div className="space-y-3">
      <DataTableSurface>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Fecha factura</TableHead>
                <TableHead className="whitespace-nowrap">Fecha cobro</TableHead>
                <TableHead>Bruto</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap">Tipo cambio</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap">Importe ARS</TableHead>
                <TableHead className="hidden lg:table-cell">Cheque / banco</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => {
                const archived = c.deletedAt != null;
                const chequeLine = [c.checkNumber?.trim(), c.checkBankLabel?.trim()].filter(Boolean).join(" · ");
                return (
                  <TableRow
                    key={c.id}
                    className={archived ? "opacity-60" : undefined}
                    title={archived ? "Archivada" : undefined}
                  >
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {shortInvoiceDateRangeArUtc(c.earliestInvoiceDate, c.latestInvoiceDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{shortDateArUtc(c.collectionDate)}</TableCell>
                    <TableCell>
                      {formatMoney(c.grossAmount, c.currencyCode)}
                      <p className="text-muted-foreground text-xs">
                        {c.paymentMethodCode || "—"} · {c._count.allocations} imput.
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell tabular-nums text-sm">
                      {c.currencyCode === "USD"
                        ? `${formatFxArsPerUsd(c.fxRateArsPerUnitUsdAtCollection)} ARS/USD`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums text-sm">
                      {formatMoney(
                        c.amountArsEquivalent ??
                          (c.currencyCode === "ARS" ? c.grossAmount : null),
                        "ARS",
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell max-w-[10rem] truncate text-sm">
                      {chequeLine || "—"}
                    </TableCell>
                    <TableCell>
                      {archived ? <Badge variant="secondary">Archivada</Badge> : null}
                      {c.voidedAt && !archived ? (
                        <Badge variant="destructive" className="ml-0">
                          {labelCollectionStatus("voided")}
                        </Badge>
                      ) : null}
                      {c.status === "valid" && !archived && !c.voidedAt ? (
                        <Badge variant="outline">{labelCollectionStatus("valid")}</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/operaciones/cobranzas/${c.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
        </Table>
      </DataTableSurface>
      {pages > 1 ? (
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            {hasPrev ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={listHref({ page: page - 1, base: searchParams })}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <span className="px-1">
              {page} / {pages}
            </span>
            {hasNext ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={listHref({ page: page + 1, base: searchParams })}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
