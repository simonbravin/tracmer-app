import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SaleStatusBadge } from "@/components/common/sale-status-badge";
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
import {
  formatDueDate,
  formatFxArsPerUsd,
  formatMoney,
  isPastDue,
  shortDateArUtc,
} from "@/lib/sales/format";
import type { CurrencyCode, SaleStatus } from "@prisma/client";

export type SaleListRow = {
  id: string;
  status: SaleStatus;
  invoiceDate: Date;
  creditDays: number;
  totalAmount: { toString(): string };
  currencyCode: CurrencyCode;
  fxRateArsPerUnitUsdAtIssue: { toString(): string } | null;
  amountArsEquivalentAtIssue: { toString(): string } | null;
  invoiceNumber: string | null;
  deletedAt: Date | null;
  client: { id: string; displayName: string; legalName: string } | null;
};

type SearchP = {
  q?: string;
  vista?: string;
  cliente?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
};

function buildListHref(p: { page: number; base: SearchP }): string {
  const s = new URLSearchParams();
  if (p.base.q) s.set("q", p.base.q);
  if (p.base.vista && p.base.vista !== "activas") s.set("vista", p.base.vista);
  if (p.base.cliente) s.set("cliente", p.base.cliente);
  if (p.base.estado) s.set("estado", p.base.estado);
  if (p.base.desde) s.set("desde", p.base.desde);
  if (p.base.hasta) s.set("hasta", p.base.hasta);
  s.set("page", String(p.page));
  return `/operaciones/ventas?${s.toString()}`;
}

export function SalesTable({
  items,
  total,
  page,
  pageSize,
  searchParams,
}: {
  items: SaleListRow[];
  total: number;
  page: number;
  pageSize: number;
  searchParams: SearchP;
}) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm">
        {searchParams.q ? (
          <>No hay resultados. Probá otros filtros o rango de fechas.</>
        ) : (
          <>No hay facturas. Creá un cliente (si aún no tenés) y registrá la primera venta.</>
        )}
      </div>
    );
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < pages;

  return (
    <div className="space-y-3">
      <div className="bg-card border-border overflow-hidden rounded-lg border">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Nº</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="whitespace-nowrap">Total</TableHead>
                <TableHead className="hidden lg:table-cell whitespace-nowrap">Tipo cambio</TableHead>
                <TableHead className="hidden lg:table-cell whitespace-nowrap">Importe ARS</TableHead>
                <TableHead className="hidden md:table-cell">Vence</TableHead>
                <TableHead className="w-10 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => {
                const archived = s.deletedAt != null;
                const vence = formatDueDate(s.invoiceDate, s.creditDays);
                const venceCritico =
                  !archived &&
                  s.status !== "collected" &&
                  s.status !== "cancelled" &&
                  s.status !== "draft" &&
                  isPastDue(s.invoiceDate, s.creditDays);
                return (
                  <TableRow
                    key={s.id}
                    className={archived ? "opacity-60" : undefined}
                    title={archived ? "Archivada" : undefined}
                  >
                    <TableCell className="whitespace-nowrap">
                      {shortDateArUtc(s.invoiceDate)}
                    </TableCell>
                    <TableCell className="max-w-[12rem] font-medium sm:max-w-sm">
                      {s.client
                        ? s.client.displayName || s.client.legalName
                        : "— (sin cliente)"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell font-mono text-sm">
                      {s.invoiceNumber?.trim() ? s.invoiceNumber : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1.5">
                        {archived ? <Badge variant="secondary">Archivada</Badge> : null}
                        <SaleStatusBadge status={s.status} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="tabular-nums text-sm sm:text-sm">
                        {formatMoney(s.totalAmount, s.currencyCode)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell tabular-nums text-sm">
                      {s.currencyCode === "USD"
                        ? `${formatFxArsPerUsd(s.fxRateArsPerUnitUsdAtIssue)} ARS/USD`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell tabular-nums text-sm">
                      {formatMoney(
                        s.amountArsEquivalentAtIssue ??
                          (s.currencyCode === "ARS" ? s.totalAmount : null),
                        "ARS",
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell align-middle">
                      {venceCritico ? (
                        <Badge
                          variant="destructive"
                          className="font-normal tabular-nums text-sm leading-none"
                        >
                          {vence}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground tabular-nums">{vence}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/operaciones/ventas/${s.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      {pages > 1 ? (
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            Mostrando {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            {hasPrev ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={buildListHref({
                    page: page - 1,
                    base: searchParams,
                  })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
            )}
            <span className="px-1">
              {page} / {pages}
            </span>
            {hasNext ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={buildListHref({
                    page: page + 1,
                    base: searchParams,
                  })}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
