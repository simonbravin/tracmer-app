"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteReportSchedule } from "@/lib/reports/scheduled/actions";

export function DeleteScheduleButton({ scheduleId }: { scheduleId: string }) {
  const r = useRouter();
  const [p, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {err ? <p className="text-destructive text-sm">{err}</p> : null}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={p}
        onClick={() => {
          if (!window.confirm("¿Anular esta programación? No se reenviarán reportes con esta regla.")) {
            return;
          }
          setErr(null);
          start(async () => {
            const res = await deleteReportSchedule(scheduleId);
            if (!res.ok) {
              setErr(res.error);
              return;
            }
            r.push("/reportes/programados");
            r.refresh();
          });
        }}
      >
        {p ? "Borrando…" : "Eliminar programación"}
      </Button>
    </div>
  );
}
