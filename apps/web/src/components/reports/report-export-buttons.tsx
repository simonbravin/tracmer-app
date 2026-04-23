"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { ReportKey } from "@/lib/reports/types";

type FilterRecord = Record<string, unknown>;

export function ReportExportButtons({ report, filter }: { report: ReportKey; filter: FilterRecord }) {
  const [loading, setLoading] = useState<null | "xlsx" | "pdf" | "csv">(null);
  const [err, setErr] = useState<string | null>(null);

  async function download(format: "xlsx" | "pdf" | "csv") {
    setErr(null);
    setLoading(format);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, report, filter }),
      });
      if (!res.ok) {
        const t = await res.text();
        setErr(t.slice(0, 200) || "Error al generar el archivo");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      let name = `export.${format}`;
      const cd = res.headers.get("Content-Disposition");
      if (cd) {
        const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
        const q = /filename="([^"]+)"/i.exec(cd);
        if (star?.[1]) {
          name = decodeURIComponent(star[1].trim());
        } else if (q?.[1]) {
          name = q[1].trim();
        }
      }
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!!loading} onClick={() => download("xlsx")}>
          {loading === "xlsx" ? "Generando…" : "Excel (.xlsx)"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!!loading}
          onClick={() => download("pdf")}
        >
          {loading === "pdf" ? "Generando…" : "PDF"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={() => download("csv")}
        >
          {loading === "csv" ? "Generando…" : "CSV"}
        </Button>
      </div>
      {err ? <p className="text-destructive text-sm">{err}</p> : null}
    </div>
  );
}
