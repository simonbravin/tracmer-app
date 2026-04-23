import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { DataTableSurface } from "@/components/ui/data-table-surface";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatMoneyPlain } from "@/lib/sales/format";

import type { ClientRankRow, ColNoDepRow, ReconRow, VencidaRow } from "@/lib/dashboard/data";
import type { CurrencyCode } from "@prisma/client";

function money(s: string, ccy: CurrencyCode) {
  return formatMoney(s, ccy);
}

export function VentasVencidasTable({ rows }: { rows: VencidaRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin ventas vencidas"
        description="No hay ventas vencidas con saldo en los filtros actuales. Probá ampliar el período o revisar el cliente seleccionado."
      />
    );
  }
  return (
    <DataTableSurface>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Factura</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Pendiente</TableHead>
            <TableHead className="hidden sm:table-cell">Venc.</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">
                {r.invoiceNumber ?? "—"}{" "}
                <span className="text-muted-foreground hidden md:inline">({r.invoiceDate})</span>
              </TableCell>
              <TableCell className="max-w-[10rem] truncate sm:max-w-xs">{r.clientLabel}</TableCell>
              <TableCell className="text-right">
                {money(r.remaining, r.currencyCode)} {r.currencyCode}
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">{r.dueLabel}</TableCell>
              <TableCell>
                <Link
                  className="text-primary text-sm underline-offset-2 hover:underline"
                  href={r.href}
                >
                  Abrir
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableSurface>
  );
}

export function CobranzasNoDepTable({ rows }: { rows: ColNoDepRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin pendientes de conciliación"
        description="No hay cobranzas con saldo pendiente de aplicar a depósito en el rango seleccionado."
      />
    );
  }
  return (
    <DataTableSurface>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha cob.</TableHead>
            <TableHead className="text-right">Bruto</TableHead>
            <TableHead className="text-right">Pend. concil.</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">
                {r.collectionDate} <span className="text-muted-foreground">({r.id.slice(0, 8)}…)</span>
              </TableCell>
              <TableCell className="text-right">
                {formatMoneyPlain(r.amount)} {r.currencyCode}
              </TableCell>
              <TableCell className="text-right">
                {formatMoneyPlain(r.pending)} {r.currencyCode}
              </TableCell>
              <TableCell>
                <Link
                  className="text-primary text-sm underline-offset-2 hover:underline"
                  href={r.href}
                >
                  Abrir
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableSurface>
  );
}

export function ConcTable({ rows }: { rows: ReconRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin conciliaciones en el período"
        description="No hay conciliaciones cerradas con fecha de cierre en el rango seleccionado."
      />
    );
  }
  return (
    <DataTableSurface>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cierre</TableHead>
            <TableHead>Líneas</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm">{r.closedAt}</TableCell>
              <TableCell>{r.lineCount}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate text-xs">{r.notes ?? "—"}</TableCell>
              <TableCell>
                <Link
                  className="text-primary text-sm underline-offset-2 hover:underline"
                  href={r.href}
                >
                  Abrir
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableSurface>
  );
}

export function ClientRanksTable({ label, rows }: { label: string; rows: ClientRankRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin datos"
        description="No hay clientes con montos en esta moneda para los filtros actuales."
        className="py-6"
      />
    );
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{label}</h3>
      <DataTableSurface>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.clientId}-${r.currencyCode}`}>
                <TableCell className="max-w-md truncate">
                  <Link
                    className="hover:text-foreground"
                    href={`/clientes/${r.clientId}`}
                  >
                    {r.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {money(r.amount, r.currencyCode)} {r.currencyCode}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableSurface>
    </div>
  );
}
