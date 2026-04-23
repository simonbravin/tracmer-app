import type { Metadata } from "next";
import Link from "next/link";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listReportSchedules } from "@/lib/reports/scheduled/data";
import { parametersOverrideSchema } from "@/lib/reports/scheduled/validation";
import { reportLabels, type ReportKey } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reportes programados",
  description: "Programá envíos por email (Excel/PDF)",
};

const fr: Record<"daily" | "weekly" | "monthly", string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

export default async function ReportesProgramadosPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Reportes programados</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const rows = await listReportSchedules(ctx.currentOrganizationId);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes programados</h1>
          <p className="text-muted-foreground text-sm">
            Definí frecuencia, hora y destinatarios. El envío lo dispara un job (por ahora{" "}
            <code className="text-xs">POST /api/jobs/run-reports</code> con <code className="text-xs">CRON_SECRET</code>
           ).
          </p>
        </div>
        <Button asChild>
          <Link href="/reportes/programados/nuevo">Nueva programación</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>
          <CardDescription>Programaciones activas e inactivas (no archivadas).</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay programaciones. Creá una con el botón de arriba.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Reporte</TableHead>
                  <TableHead>Frecuencia / hora</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const rt = s.reportDefinition?.reportType as ReportKey | undefined;
                  const fmt =
                    s.reportDefinition?.defaultParameters != null
                      ? (s.reportDefinition.defaultParameters as { format?: string })?.format
                      : "—";
                  const o = parametersOverrideSchema.safeParse(s.parametersOverride);
                  const sc = o.success ? o.data.schedule : null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.reportDefinition?.name}</TableCell>
                      <TableCell>{rt != null && rt in reportLabels ? reportLabels[rt] : rt}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {sc
                          ? `${fr[sc.frequency]} @ ${sc.time}${sc.frequency === "weekly" && sc.dayOfWeek != null ? ` (dow ${sc.dayOfWeek})` : ""}${
                            sc.frequency === "monthly" && sc.dayOfMonth != null
                              ? ` (día ${sc.dayOfMonth})`
                              : ""
                          }`
                          : s.cronExpression}
                      </TableCell>
                      <TableCell className="text-sm">{s.timezone}</TableCell>
                      <TableCell className="text-sm uppercase">{String(fmt)}</TableCell>
                      <TableCell>{s.isActive ? "Sí" : "No"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/reportes/programados/${s.id}/editar`}>Editar</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
