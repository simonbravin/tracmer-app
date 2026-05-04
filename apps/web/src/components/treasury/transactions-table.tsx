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
import type { TransactionFeedRow } from "@/lib/treasury/transactions-feed";
import { formatMoney } from "@/lib/sales/format";

const originLabel: Record<TransactionFeedRow["origin"], string> = {
  deposito_bancario: "Depósito",
  transferencia: "Transferencia",
  cobranza: "Cobranza",
  gasto_cobranza: "Gasto cobranza",
  movimiento_manual: "Manual",
};

const flowLabel: Record<TransactionFeedRow["flow"], string> = {
  ingreso: "Ingreso",
  egreso: "Egreso",
  interno: "Interno",
};

type SearchP = {
  vista?: string;
  desde?: string;
  hasta?: string;
  moneda?: string;
  ubicacion?: string;
  flujo?: string;
};

function listHref(p: { page: number; base: SearchP }) {
  const s = new URLSearchParams();
  if (p.base.vista && p.base.vista !== "efectivo") s.set("vista", p.base.vista);
  if (p.base.desde) s.set("desde", p.base.desde);
  if (p.base.hasta) s.set("hasta", p.base.hasta);
  if (p.base.moneda) s.set("moneda", p.base.moneda);
  if (p.base.ubicacion) s.set("ubicacion", p.base.ubicacion);
  if (p.base.flujo && p.base.flujo !== "todos") s.set("flujo", p.base.flujo);
  s.set("page", String(p.page));
  return `/tesoreria/transacciones?${s.toString()}`;
}

export function TransactionsTable({
  rows,
  total,
  page,
  pageSize,
  range,
  searchParams,
}: {
  rows: TransactionFeedRow[];
  total: number;
  page: number;
  pageSize: number;
  range: { desde: string; hasta: string };
  searchParams: SearchP;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm">
        No hay movimientos en el rango {range.desde} — {range.hasta}. Probá ampliar fechas o cambiar filtros.
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
              <TableHead className="hidden md:table-cell">Ubicación</TableHead>
              <TableHead>Flujo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-16 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm">{r.documentDate}</TableCell>
                <TableCell className="max-w-[14rem]">
                  <div className="font-medium leading-tight">{r.title}</div>
                  <div className="text-muted-foreground truncate text-xs">{r.subtitle}</div>
                  <div className="mt-0.5 md:hidden">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {r.treasuryLocationLabel ?? "—"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {originLabel[r.origin]}
                  </Badge>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">{r.treasuryLocationLabel ?? "—"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{flowLabel[r.flow]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatMoney(r.amount, r.currencyCode)}
                </TableCell>
                <TableCell className="text-right">
                  {r.href ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={r.href}>Ir</Link>
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
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
