import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reportDescriptions, reportKeys, reportLabels } from "@/lib/reports/types";

export const metadata: Metadata = {
  title: "Reportes",
  description: "Listados y exportaciones",
};

export default function ReportesIndexPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes y exportaciones</h1>
        <p className="text-muted-foreground text-sm">
          Elegí un reporte, ajustá filtros y descargá Excel, PDF o CSV. Los datos se generan en el servidor con tu
          organización actual.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link href="/reportes/programados">
            <Card className="transition-colors hover:border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">Reportes programados</CardTitle>
                <CardDescription className="line-clamp-2">
                  Envío automático por email (Excel o PDF) con frecuencia diaria, semanal o mensual.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
        {reportKeys.map((k) => (
          <li key={k}>
            <Link href={`/reportes/${k}`}>
              <Card className="transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">{reportLabels[k]}</CardTitle>
                  <CardDescription className="line-clamp-2">{reportDescriptions[k]}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
