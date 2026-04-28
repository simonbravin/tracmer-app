import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableSurface } from "@/components/ui/data-table-surface";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listBankAccountsForFilter } from "@/lib/banks/data";
import { type ReportRunInput, runReport } from "@/lib/reports/data";
import { reportDescriptions, reportKeys, reportLabels, type ReportKey } from "@/lib/reports/types";
import {
  defaultDateRangeYmd,
  parseClientesFilters,
  parseCobranzasFilters,
  parseConciliacionesFilters,
  parseDepositosFilters,
  parseVentasFilters,
} from "@/lib/reports/validation";
import { listActiveClients } from "@/lib/sales/data";
import { labelSaleStatus, saleStatusesForList } from "@/lib/sales/status";

export const dynamic = "force-dynamic";

const isKey = (s: string): s is ReportKey => (reportKeys as readonly string[]).includes(s);

type P = { params: Promise<{ reportKey: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function toSearchParams(sp0: Record<string, string | string[] | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp0)) {
    if (v == null) continue;
    if (Array.isArray(v)) sp.set(k, v[0] ?? "");
    else sp.set(k, v);
  }
  return sp;
}

function resolveFilter(reportKey: ReportKey, sp: URLSearchParams) {
  const dr = defaultDateRangeYmd();
  switch (reportKey) {
    case "ventas": {
      const p = parseVentasFilters(sp);
      return p.success
        ? p.data
        : { desde: dr.desde, hasta: dr.hasta, visibilidad: "activas" as const };
    }
    case "cobranzas": {
      const p = parseCobranzasFilters(sp);
      return p.success
        ? p.data
        : { desde: dr.desde, hasta: dr.hasta, visibilidad: "activas" as const };
    }
    case "depositos": {
      const p = parseDepositosFilters(sp);
      return p.success
        ? p.data
        : { desde: dr.desde, hasta: dr.hasta, visibilidad: "activas" as const };
    }
    case "conciliaciones": {
      const p = parseConciliacionesFilters(sp);
      return p.success
        ? p.data
        : {
            desde: dr.desde,
            hasta: dr.hasta,
            visibilidad: "activas" as const,
            porFecha: "closed" as const,
          };
    }
    case "clientes": {
      const p = parseClientesFilters(sp);
      return p.success ? p.data : { q: undefined };
    }
    default:
      return { desde: dr.desde, hasta: dr.hasta, visibilidad: "activas" as const };
  }
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { reportKey } = await params;
  if (!isKey(reportKey)) {
    return { title: "Reporte" };
  }
  return { title: `Reporte: ${reportLabels[reportKey]}` };
}

export default async function ReporteDetallePage({ params, searchParams }: P) {
  const { reportKey: raw } = await params;
  if (!isKey(raw)) {
    notFound();
  }
  const reportKey = raw;
  const sp = toSearchParams(await searchParams);
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const dr = defaultDateRangeYmd();
  const filter = resolveFilter(reportKey, sp);
  const runInput = { report: reportKey, filter } as ReportRunInput;
  const table = await runReport(orgId, runInput, { limit: 50 });
  const clients = reportKey === "ventas" || reportKey === "cobranzas" ? await listActiveClients(orgId) : [];
  const cuentas = reportKey === "depositos" ? await listBankAccountsForFilter(orgId) : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link className="text-muted-foreground text-sm hover:underline" href="/reportes">
          ← Todos los reportes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{reportLabels[reportKey]}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{reportDescriptions[reportKey]}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Generación en servidor. Excel/CSV: dataset completo hasta tope. PDF: vista resumida (muchas filas se recortan en
          el documento). Stack Node (ExcelJS + PDFKit); equivalente a openpyxl/reportlab en criterio de entrega.
        </p>
      </div>
      {reportKey !== "clientes" && (
        <form method="GET" className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Desde</Label>
            <Input type="date" name="desde" defaultValue={sp.get("desde") || dr.desde} className="mt-1" />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" name="hasta" defaultValue={sp.get("hasta") || dr.hasta} className="mt-1" />
          </div>
          <div>
            <Label>Visibilidad</Label>
            <select
              name="visibilidad"
              className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
              defaultValue={sp.get("visibilidad") || "activas"}
            >
              <option value="activas">Solo no archivados (activas)</option>
              <option value="archivadas">Archivados</option>
              <option value="todas">Todos</option>
            </select>
          </div>
          {reportKey === "ventas" && (
            <>
              <div>
                <Label>Cliente</Label>
                <select
                  name="cliente"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("cliente") || ""}
                >
                  <option value="">(todos)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName || c.legalName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  name="estado"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("estado") || ""}
                >
                  <option value="">(todos)</option>
                  {saleStatusesForList.map((s) => (
                    <option key={s} value={s}>
                      {labelSaleStatus(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Moneda</Label>
                <select
                  name="moneda"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("moneda") || ""}
                >
                  <option value="">(todas)</option>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </>
          )}
          {reportKey === "cobranzas" && (
            <>
              <div>
                <Label>Cliente (imputación a factura)</Label>
                <select
                  name="cliente"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("cliente") || ""}
                >
                  <option value="">(todos)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName || c.legalName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Moneda</Label>
                <select
                  name="moneda"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("moneda") || ""}
                >
                  <option value="">(todas)</option>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </>
          )}
          {reportKey === "depositos" && (
            <>
              <div>
                <Label>Cuenta</Label>
                <select
                  name="cuenta"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("cuenta") || ""}
                >
                  <option value="">(todas)</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.bankName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Moneda</Label>
                <select
                  name="moneda"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("moneda") || ""}
                >
                  <option value="">(todas)</option>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </>
          )}
          {reportKey === "conciliaciones" && (
            <>
              <div>
                <Label>Estado concil.</Label>
                <select
                  name="estado"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("estado") || ""}
                >
                  <option value="">(todos)</option>
                  <option value="draft">Borrador</option>
                  <option value="closed">Cerrada</option>
                  <option value="voided">Anulada</option>
                </select>
              </div>
              <div>
                <Label>Filtrar fechas por</Label>
                <select
                  name="porFecha"
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={sp.get("porFecha") || "closed"}
                >
                  <option value="closed">Cierre o borrador creado en rango</option>
                  <option value="created">Fecha de alta (creada)</option>
                </select>
              </div>
            </>
          )}
          <div className="flex items-end">
            <Button type="submit">Aplicar</Button>
          </div>
        </form>
      )}
      {reportKey === "clientes" && (
        <form method="GET" className="flex max-w-md flex-col gap-2 rounded-lg border p-4">
          <Label>Buscar</Label>
          <div className="flex gap-2">
            <Input name="q" defaultValue={sp.get("q") || ""} placeholder="Nombre, razón, CUIT…" className="flex-1" />
            <Button type="submit">Aplicar</Button>
          </div>
        </form>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exportar</CardTitle>
          <CardDescription>
            Descarga generada en el mismo servidor de la app (Node). Excel/CSV: datos tabulares completos bajo tope. PDF
            con tabla simple y recorte de filas si aplica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportExportButtons report={reportKey} filter={filter as Record<string, unknown>} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium">Vista previa (hasta 50 filas)</h2>
        {table.truncated && (
          <p className="text-muted-foreground mb-2 text-sm">
            Hay más resultados: la exportación Excel/CSV incluye más filas; el PDF se limita automáticamente.
          </p>
        )}
        <DataTableSurface>
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers.map((h) => (
                  <TableHead key={h} className="whitespace-nowrap text-xs">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={table.headers.length} className="text-muted-foreground">
                    Sin datos
                  </TableCell>
                </TableRow>
              ) : (
                table.rows.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => (
                      <TableCell key={j} className="text-xs">
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableSurface>
      </div>
    </div>
  );
}
