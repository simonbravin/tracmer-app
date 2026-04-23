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
import { dateTimeAr } from "@/lib/sales/format";
import type { ReconciliationStatus } from "@prisma/client";

export type ReconciliationListRow = {
  id: string;
  status: ReconciliationStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  deletedAt: Date | null;
  _count: { lines: number; discrepancies: number };
};

type SearchP = {
  q?: string;
  vista?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
};

function listHref(p: { page: number; base: SearchP }) {
  const s = new URLSearchParams();
  if (p.base.q) s.set("q", p.base.q);
  if (p.base.vista && p.base.vista !== "activas") s.set("vista", p.base.vista);
  if (p.base.estado && p.base.estado !== "all") s.set("estado", p.base.estado);
  if (p.base.desde) s.set("desde", p.base.desde);
  if (p.base.hasta) s.set("hasta", p.base.hasta);
  s.set("page", String(p.page));
  return `/bancos/conciliaciones?${s.toString()}`;
}

function statusBadge(s: ReconciliationStatus) {
  if (s === "draft") {
    return <Badge variant="secondary">Borrador</Badge>;
  }
  if (s === "closed") {
    return <Badge variant="default">Cerrada</Badge>;
  }
  return <Badge variant="outline">Anulada</Badge>;
}

export function ReconciliationsTable({
  items,
  total,
  page,
  pageSize,
  searchParams,
}: {
  items: ReconciliationListRow[];
  total: number;
  page: number;
  pageSize: number;
  searchParams: SearchP;
}) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm">
        {searchParams.q
          ? "No hay resultados."
          : "No hay conciliaciones. Creá una nueva o ajustá filtros (incl. archivadas)."}
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
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Creada</TableHead>
                <TableHead className="text-right">Líneas</TableHead>
                <TableHead className="text-right">Dif.</TableHead>
                <TableHead className="w-20 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => {
                const archived = r.deletedAt != null;
                return (
                  <TableRow key={r.id} className={archived ? "opacity-60" : undefined} title={archived ? "Archivada" : undefined}>
                    <TableCell>
                      {statusBadge(r.status)}
                      {r.notes?.trim() ? (
                        <p className="text-muted-foreground mt-1 line-clamp-1 max-w-xs text-xs">{r.notes}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell text-sm">
                      {dateTimeAr(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r._count.lines}</TableCell>
                    <TableCell className="text-right tabular-nums">{r._count.discrepancies}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/bancos/conciliaciones/${r.id}`}>Ver</Link>
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
