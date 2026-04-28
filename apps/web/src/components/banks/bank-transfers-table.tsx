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
import { shortDateArUtc, formatMoney } from "@/lib/sales/format";
import type { CurrencyCode } from "@prisma/client";

export type BankTransferListRow = {
  id: string;
  transferDate: Date;
  amount: { toString(): string };
  currencyCode: CurrencyCode;
  feeAmount: { toString(): string } | null;
  notes: string | null;
  deletedAt: Date | null;
  fromAccount: { id: string; name: string; bankName: string; currencyCode: CurrencyCode };
  toAccount: { id: string; name: string; bankName: string; currencyCode: CurrencyCode };
};

type SearchP = {
  q?: string;
  vista?: string;
  moneda?: string;
  cuenta?: string;
  desde?: string;
  hasta?: string;
};

function listHref(p: { page: number; base: SearchP }) {
  const s = new URLSearchParams();
  if (p.base.q) s.set("q", p.base.q);
  if (p.base.vista && p.base.vista !== "activas") s.set("vista", p.base.vista);
  if (p.base.moneda) s.set("moneda", p.base.moneda);
  if (p.base.cuenta) s.set("cuenta", p.base.cuenta);
  if (p.base.desde) s.set("desde", p.base.desde);
  if (p.base.hasta) s.set("hasta", p.base.hasta);
  s.set("page", String(p.page));
  return `/bancos/transferencias?${s.toString()}`;
}

export function BankTransfersTable({
  items,
  total,
  page,
  pageSize,
  searchParams,
}: {
  items: BankTransferListRow[];
  total: number;
  page: number;
  pageSize: number;
  searchParams: SearchP;
}) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm">
        {searchParams.q || searchParams.cuenta || searchParams.moneda || searchParams.desde || searchParams.hasta
          ? "No hay resultados. Probá otros criterios."
          : "No hay transferencias. Registrá la primera entre dos cuentas en la misma moneda."}
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
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">{shortDateArUtc(row.transferDate)}</TableCell>
                  <TableCell className="max-w-[10rem] truncate text-sm">
                    <span className="text-muted-foreground">{row.fromAccount.currencyCode}</span>{" "}
                    {row.fromAccount.name}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-sm">
                    <span className="text-muted-foreground">{row.toAccount.currencyCode}</span>{" "}
                    {row.toAccount.name}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(row.amount, row.currencyCode)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                    {row.feeAmount != null && Number(row.feeAmount.toString()) > 0
                      ? formatMoney(row.feeAmount, row.currencyCode)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {row.deletedAt ? (
                      <Badge variant="secondary">Archivado</Badge>
                    ) : (
                      <Button variant="link" className="h-auto p-0 text-sm" asChild>
                        <Link href={`/bancos/transferencias/${row.id}`}>Ver</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
      </DataTableSurface>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          Página {page} de {pages} · {total} registro{total !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!hasPrev} asChild>
            <Link href={listHref({ page: page - 1, base: searchParams })}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext} asChild>
            <Link href={listHref({ page: page + 1, base: searchParams })}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
