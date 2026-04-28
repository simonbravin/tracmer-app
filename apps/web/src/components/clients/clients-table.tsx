import Link from "next/link";

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
import { formatTaxId } from "@/lib/clients/format";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ClientRow = {
  id: string;
  legalName: string;
  displayName: string;
  taxId: string | null;
  deletedAt: Date | null;
  _count: { contacts: number };
};

export function ClientsTable({
  items,
  total,
  page,
  pageSize,
  searchParams,
}: {
  items: ClientRow[];
  total: number;
  page: number;
  pageSize: number;
  searchParams: { q?: string; estado?: string };
}) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm">
        {searchParams.q ? (
          <>No hay resultados para la búsqueda. Probá otra leyenda o limpiá los filtros.</>
        ) : (
          <>Aún no cargaste clientes. Usá &ldquo;Nuevo cliente&rdquo; para empezar.</>
        )}
      </div>
    );
  }

  const buildHref = (nextPage: number) => {
    const p = new URLSearchParams();
    if (searchParams.q) p.set("q", searchParams.q);
    if (searchParams.estado && searchParams.estado !== "activos")
      p.set("estado", searchParams.estado);
    p.set("page", String(nextPage));
    return `/clientes?${p.toString()}`;
  };
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < pages;

  return (
    <div className="space-y-3">
      <DataTableSurface>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razón social</TableHead>
              <TableHead className="hidden sm:table-cell">Visible</TableHead>
              <TableHead className="hidden md:table-cell">CUIT</TableHead>
              <TableHead className="w-24">Contactos</TableHead>
              <TableHead className="w-32">Estado</TableHead>
              <TableHead className="w-28 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => {
              const archived = c.deletedAt != null;
              return (
                <TableRow key={c.id} className={archived ? "opacity-60" : undefined}>
                  <TableCell className="max-w-[18rem] font-medium">
                    {c.legalName}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {c.displayName}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm hidden md:table-cell">
                    {formatTaxId(c.taxId)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c._count.contacts}
                  </TableCell>
                  <TableCell>
                    {archived ? (
                      <Badge variant="secondary">Archivado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Activo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/clientes/${c.id}`}>Ver</Link>
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
            Mostrando {(page - 1) * pageSize + 1} –{" "}
            {Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            {hasPrev ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildHref(page - 1)}>
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
                <Link href={buildHref(page + 1)}>
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
