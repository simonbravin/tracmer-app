"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeReconciliation, type ActionState } from "@/lib/reconciliations/actions";
import { DISCREPANCY_CATEGORIES } from "@/lib/reconciliations/discrepancy-categories";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Cerrando…" : "Cerrar conciliación"}
    </Button>
  );
}

type Code = (typeof DISCREPANCY_CATEGORIES)[number]["code"];

type Disc = {
  key: string;
  categoryCode: Code;
  amount: string;
  currencyCode: "ARS" | "USD";
  notes: string;
  lineId: string;
};

function newK() {
  return `d_${Math.random().toString(36).slice(2, 9)}`;
}

export function ReconciliationCloseForm({
  reconciliationId,
  lineOptions,
}: {
  reconciliationId: string;
  lineOptions: { id: string; label: string }[];
}) {
  const [state, action] = useFormState(
    closeReconciliation.bind(
      null,
      reconciliationId,
    ) as (a: ActionState | null, f: FormData) => Promise<ActionState>,
    null,
  );
  const [rows, setRows] = useState<Disc[]>([]);
  const [json, setJson] = useState("[]");
  const router = useRouter();
  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);
  useEffect(() => {
    const built = rows
      .map((r) => {
        const t = r.amount.replace(/\s/g, "").replace(",", ".");
        const n = Number(t);
        if (!r.amount.trim() || !Number.isFinite(n) || n <= 0) {
          return null;
        }
        return {
          categoryCode: r.categoryCode,
          amount: r.amount,
          currencyCode: r.currencyCode,
          notes: r.notes || undefined,
          lineId: r.lineId || undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    setJson(JSON.stringify(built));
  }, [rows]);
  return (
    <form action={action} className="space-y-4">
      {state?.success === false ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert>
          <AlertDescription>{(state as { message?: string }).message}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="discrepanciesJson" value={json} readOnly />
      <p className="text-muted-foreground text-sm">
        Cerrar valida saldos. Diferencias opcionales: si agregás filas, cada importe debe ser mayor a
        0. Podés cerrar con lista vacía de diferencias.
      </p>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Diferencias (opcional)</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setRows((p) => [
                ...p,
                {
                  key: newK(),
                  categoryCode: DISCREPANCY_CATEGORIES[0].code as Code,
                  amount: "",
                  currencyCode: "ARS",
                  notes: "",
                  lineId: "",
                },
              ])
            }
          >
            Agregar diferencia
          </Button>
        </div>
        {rows.map((r) => (
          <div
            key={r.key}
            className="bg-muted/20 grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="grid gap-1">
              <Label className="text-xs">Categoría</Label>
              <select
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                value={r.categoryCode}
                onChange={(e) => {
                  const v = e.target.value as Code;
                  setRows((R) => R.map((x) => (x.key === r.key ? { ...x, categoryCode: v } : x)));
                }}
              >
                {DISCREPANCY_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Monto</Label>
              <Input
                value={r.amount}
                onChange={(e) =>
                  setRows((R) => R.map((x) => (x.key === r.key ? { ...x, amount: e.target.value } : x)))
                }
                inputMode="decimal"
                placeholder="0,00"
                className="h-9"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Moneda</Label>
              <select
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                value={r.currencyCode}
                onChange={(e) => {
                  const v = e.target.value as "ARS" | "USD";
                  setRows((R) => R.map((x) => (x.key === r.key ? { ...x, currencyCode: v } : x)));
                }}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Línea (opcional)</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={r.lineId}
                onChange={(e) =>
                  setRows((R) => R.map((x) => (x.key === r.key ? { ...x, lineId: e.target.value } : x)))
                }
              >
                <option value="">(a nivel de sesión)</option>
                {lineOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Notas</Label>
              <Input
                className="h-9"
                value={r.notes}
                onChange={(e) =>
                  setRows((R) => R.map((x) => (x.key === r.key ? { ...x, notes: e.target.value } : x)))
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" variant="ghost" onClick={() => setRows((R) => R.filter((x) => x.key !== r.key))}>
                Quitar
              </Button>
            </div>
          </div>
        ))}
      </div>
      <SubmitButton />
    </form>
  );
}
