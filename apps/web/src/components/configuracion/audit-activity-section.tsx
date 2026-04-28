import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogListRow } from "@/lib/audit/data";
import { dateTimeAr } from "@/lib/sales/format";

export function AuditActivitySection({ rows }: { rows: AuditLogListRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Registro de actividad</CardTitle>
        <CardDescription>
          Cambios relevantes en esta organización (quién, qué, cuándo). Se irá completando a medida que la app registre
          eventos en auditoría.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no hay eventos registrados para esta organización. Al guardar preferencias de alertas o reconocer /
            cerrar alertas desde la app, aparecerán acá.
          </p>
        ) : (
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuándo</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{dateTimeAr(r.occurredAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.action}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[14rem] truncate text-sm">
                      {r.entityType}
                      {r.entityId ? ` · ${r.entityId.slice(0, 8)}…` : ""}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm">
                      {r.actorName || r.actorEmail || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
