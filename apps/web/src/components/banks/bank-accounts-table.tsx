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
import type { CurrencyCode } from "@prisma/client";

export type BankAccountListRow = {
  id: string;
  name: string;
  bankName: string;
  currencyCode: CurrencyCode;
  accountIdentifierMasked: string;
  isActive: boolean;
  deletedAt: Date | null;
  _count: { deposits: number };
};

type SearchP = { q?: string; vista?: string };

function listHref(p: { page: number; base: SearchP }) {
  const s = new URLSearchParams();
  if (p.base.q) s.set("q", p.base.q);
  if (p.base.vista && p.base.vista !== "activas") s.set("vista", p.base.vista);
  s.set("page", String(p.page));
  return `/bancos/cuentas?${s.toString()}`;
}

export function BankAccountsTable({
  items,
  total,
  page,
  pageSize,
  searchParams,
}: {
  items: BankAccountListRow[];
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
          : "No hay cuentas. Creá la primera."}
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
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Banco</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="hidden md:table-cell">Referencia</TableHead>
                <TableHead className="text-right">Depósitos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => {
                const archived = a.deletedAt != null;
                return (
                  <TableRow
                    key={a.id}
                    className={archived ? "opacity-60" : undefined}
                    title={archived ? "Archivada" : undefined}
                  >
                    <TableCell className="max-w-[12rem] font-medium">
                      <div className="truncate">{a.name}</div>
                      <div className="text-muted-foreground truncate text-xs sm:hidden">{a.bankName}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-[10rem] truncate sm:table-cell">
                      {a.bankName}
                    </TableCell>
                    <TableCell>{a.currencyCode}</TableCell>
                    <TableCell className="hidden max-w-[10rem] font-mono text-sm md:table-cell">
                      {a.accountIdentifierMasked}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {a._count.deposits}
                    </TableCell>
                    <TableCell>
                      {archived ? (
                        <Badge variant="secondary">Archivada</Badge>
                      ) : a.isActive ? (
                        <Badge variant="outline">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/bancos/cuentas/${a.id}`}>Ver</Link>
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