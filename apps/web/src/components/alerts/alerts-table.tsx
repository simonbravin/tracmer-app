import Link from "next/link";
import type { ReactNode } from "react";

import { updateAlertStatusAction } from "@/lib/alerts/actions";
import { labelAlertType, labelSeverity } from "@/lib/alerts/constants";
import { AlertStatus } from "@prisma/client";

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
import { cn } from "@/lib/utils";

import type { AlertListRow } from "@/lib/alerts/data";

const fmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

function ActionButton({
  type,
  entityType,
  entityId,
  action,
  children,
  variant = "secondary",
}: {
  type: string;
  entityType: string;
  entityId: string;
  action: "acknowledge" | "close";
  children: ReactNode;
  variant?: "secondary" | "outline" | "ghost";
}) {
  return (
    <form action={updateAlertStatusAction}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" size="sm" variant={variant}>
        {children}
      </Button>
    </form>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const c =
    status === AlertStatus.open
      ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
      : status === AlertStatus.acknowledged
        ? "bg-sky-500/15 text-sky-800 dark:text-sky-200"
        : "bg-muted text-muted-foreground";
  const t =
    status === AlertStatus.open ? "Abierta" : status === AlertStatus.acknowledged ? "Reconocida" : "Cerrada";
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", c)}>{t}</span>;
}

export function AlertsTable({ items }: { items: AlertListRow[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay alertas con los filtros actuales.</p>;
  }

  return (
    <DataTableSurface>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead>Tipo / severidad</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            <TableHead className="text-right">Origen</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.key}>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell className="max-w-[10rem] text-sm">
                <div className="font-medium leading-tight">{labelAlertType(r.type)}</div>
                <div className="text-muted-foreground text-xs">{labelSeverity(r.severity)}</div>
              </TableCell>
              <TableCell className="max-w-md text-sm">
                <div className="font-medium">{r.title}</div>
                <div className="text-muted-foreground text-xs leading-snug">{r.detail}</div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
                {fmt.format(r.sortAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="link" className="h-auto p-0">
                  <Link href={r.href}>Abrir</Link>
                </Button>
              </TableCell>
              <TableCell>
                {r.status === AlertStatus.closed ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : (
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
                    {r.status === AlertStatus.open && (
                      <ActionButton
                        type={r.type}
                        entityType={r.entityType}
                        entityId={r.entityId}
                        action="acknowledge"
                      >
                        Reconocer
                      </ActionButton>
                    )}
                    <ActionButton
                      type={r.type}
                      entityType={r.entityType}
                      entityId={r.entityId}
                      action="close"
                      variant="outline"
                    >
                      Cerrar
                    </ActionButton>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableSurface>
  );
}
