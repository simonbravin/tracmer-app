import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { shortDateArUtc, formatMoney, formatMoneyPlain } from "@/lib/sales/format";
import type { CurrencyCode } from "@prisma/client";

export type BankDepositListRow = {
  id: string;
  depositDate: Date;
  amount: { toString(): string };
  currencyCode: CurrencyCode;
  reference: string | null;
  amountArsEquivalent: { toString(): string } | null;
  deletedAt: Date | null;
  bankAccount: { id: string; name: string; bankName: string; currencyCode: CurrencyCode };
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
  return `/bancos/depositos?${s.toString()}`;
}

export function BankDepositsTable({
  items,
  total,
  page,
  pageSize,
  searchParams,
}: {
  items: BankDepositListRow[];
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
          : "No hay depósitos. Registrá el primero cuando tengas una cuenta activa."}
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
                <TableHead className="hidden min-w-[8rem] sm:table-cell">Cuenta</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="hidden sm:table-cell">Equiv. ARS</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => {
                const archived = d.deletedAt != null;
                return (
                  <TableRow
                    key={d.id}
                    className={archived ? "opacity-60" : undefined}
                    title={archived ? "Archivado" : undefined}
                  >
                    <TableCell className="whitespace-nowrap">
                      {shortDateArUtc(d.depositDate)}
                      <p className="text-muted-foreground text-xs sm:hidden">
                        {d.bankAccount.name}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="max-w-[10rem] truncate text-sm" title={d.bankAccount.name}>
                        {d.bankAccount.name}
                      </div>
                      <div className="text-muted-foreground text-xs">{d.bankAccount.bankName}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(d.amount, d.currencyCode)}
                      {d.reference?.trim() ? (
                        <p className="text-muted-foreground truncate text-xs" title={d.reference}>
                          Ref: {d.reference}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell tabular-nums text-sm">
                      {d.amountArsEquivalent
                        ? `${formatMoneyPlain(d.amountArsEquivalent)} ARS`
                        : "—"}
                    </TableCell>
                    <TableCell>{archived ? <Badge variant="secondary">Archivado</Badge> : null}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/bancos/depositos/${d.id}`}>Ver</Link>
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
