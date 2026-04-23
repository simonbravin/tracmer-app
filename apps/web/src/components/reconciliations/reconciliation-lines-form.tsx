"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { shortDateArUtc, formatMoney } from "@/lib/sales/format";
import type { ActionState } from "@/lib/reconciliations/actions";
import type { ColAvail, DepAvail } from "@/lib/reconciliations/data";

type Col = ColAvail;
type Dep = DepAvail;

type Row = { key: string; collectionId: string; bankDepositId: string; amount: string };

function newKey() {
  return `k_${Math.random().toString(36).slice(2, 11)}`;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {children}
    </Button>
  );
}

function colLabel(c: Col) {
  return `${shortDateArUtc(c.collectionDate)} · ${formatMoney(c.grossAmount, c.currencyCode)} (pend. ${formatMoney(c.pending, c.currencyCode)})`;
}

function depLabel(d: Dep) {
  return `${shortDateArUtc(d.depositDate)} · ${d.bankAccount.name} · ${formatMoney(d.amount, d.currencyCode)} (pend. ${formatMoney(d.pending, d.currencyCode)})`;
}

type PropsCreate = {
  mode: "create";
  formAction: (s: ActionState | null, f: FormData) => Promise<ActionState>;
  collections: Col[];
  deposits: Dep[];
};

type PropsEdit = {
  mode: "edit";
  formAction: (s: ActionState | null, f: FormData) => Promise<ActionState>;
  collections: Col[];
  deposits: Dep[];
  defaultNotes: string;
  defaultRows: { collectionId: string; bankDepositId: string; amount: string }[];
  backHref: string;
};

export function ReconciliationLinesForm(props: PropsCreate | PropsEdit) {
  const { collections, deposits } = props;
  const [rows, setRows] = useState<Row[]>(
    props.mode === "edit"
      ? props.defaultRows.map((r) => ({ key: newKey(), ...r }))
      : [{ key: newKey(), collectionId: "", bankDepositId: "", amount: "" }],
  );
  const [notes, setNotes] = useState(props.mode === "edit" ? props.defaultNotes : "");
  const linesJson = useMemo(
    () =>
      JSON.stringify({
        lines: rows
          .filter((r) => r.collectionId && r.bankDepositId && r.amount.trim())
          .map((r) => ({
            collectionId: r.collectionId,
            bankDepositId: r.bankDepositId,
            amount: r.amount,
          })),
      }),
    [rows],
  );
  const onAdd = useCallback(() => {
    setRows((r) => [...r, { key: newKey(), collectionId: "", bankDepositId: "", amount: "" }]);
  }, []);
  const onRemove = useCallback((key: string) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.key !== key)));
  }, []);

  const [state, action] = useFormState(props.formAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.success && props.mode === "edit") {
      router.refresh();
    }
  }, [state, props.mode, router]);

  return (
    <form action={action} className="max-w-3xl space-y-6">
      {state?.success === false ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.error}
            {state.fieldErrors ? (
              <ul className="mt-2 list-inside list-disc text-sm">
                {Object.entries(state.fieldErrors).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {state?.success && "message" in (state as object) ? (
        <Alert>
          <AlertDescription>{(state as { message?: string }).message}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="linesJson" value={linesJson} readOnly />
      <div className="grid gap-2">
        <Label htmlFor="rec-notes">Notas (opcional)</Label>
        <Textarea
          id="rec-notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        <p className="text-muted-foreground text-xs">Solo cobranza y depósito con la misma moneda por línea (MVP, ver documentación de producto).</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Líneas cobranza ↔ depósito</Label>
          <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Agregar línea
          </Button>
        </div>
        {rows.map((row) => {
          const col = collections.find((c) => c.id === row.collectionId);
          const depsF = col ? deposits.filter((d) => d.currencyCode === col.currencyCode) : [];
          return (
            <div key={row.key} className="bg-muted/30 border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Label className="text-xs">Cobranza (pendiente {">"} 0 en listas)</Label>
                <select
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  value={row.collectionId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((R) =>
                      R.map((x) =>
                        x.key === row.key
                          ? {
                              ...x,
                              collectionId: v,
                              bankDepositId: "",
                            }
                          : x,
                      ),
                    );
                  }}
                >
                  <option value="">Elegir cobranza</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {colLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-5">
                <Label className="text-xs">Depósito (misma moneda que cobranza)</Label>
                <select
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  value={row.bankDepositId}
                  disabled={!row.collectionId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((R) => R.map((x) => (x.key === row.key ? { ...x, bankDepositId: v } : x)));
                  }}
                >
                  <option value="">{row.collectionId ? "Elegir depósito" : "Elegí cobranza primero"}</option>
                  {depsF.map((d) => (
                    <option key={d.id} value={d.id}>
                      {depLabel(d)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Importe</Label>
                <div className="mt-1 flex items-center gap-1">
                  <Input
                    value={row.amount}
                    onChange={(e) => {
                      const t = e.target.value;
                      setRows((R) => R.map((x) => (x.key === row.key ? { ...x, amount: t } : x)));
                    }}
                    inputMode="decimal"
                    className="tabular-nums"
                    placeholder="0,00"
                  />
                  {rows.length > 1 ? (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onRemove(row.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {col && row.amount && !Number.isNaN(Number(String(row.amount).replace(",", "."))) ? (
                  <p className="text-muted-foreground text-xs">
                    Tope aprox. cobranza: {formatMoney(col.pending, col.currencyCode)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>
          {props.mode === "create" ? "Crear borrador" : "Guardar borrador"}
        </SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={props.mode === "create" ? "/bancos/conciliaciones" : props.backHref}>
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  );
}
