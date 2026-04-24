"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/collections/actions";
import type { ImputableSaleRow } from "@/lib/collections/data";

type AllocRow = { key: string; saleId: string; amount: string; fx: string };
type FeeRow = { key: string; description: string; amount: string; currencyCode: "ARS" | "USD"; fx: string };

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

const emptyAlloc = (): AllocRow => ({ key: newKey(), saleId: "", amount: "", fx: "" });
const emptyFee = (): FeeRow => ({
  key: newKey(),
  description: "",
  amount: "",
  currencyCode: "ARS",
  fx: "1",
});

function useJsonSerializers(allocs: AllocRow[], fees: FeeRow[]) {
  const allocationsJson = useMemo(
    () =>
      JSON.stringify(
        allocs
          .filter((a) => a.saleId && a.amount)
          .map((a) => ({
            saleId: a.saleId,
            amountInCollectionCurrency: a.amount,
            fxRateToSaleCurrency: a.fx && a.fx.trim() ? a.fx : undefined,
          })),
      ),
    [allocs],
  );
  const feesJson = useMemo(
    () =>
      JSON.stringify(
        fees
          .filter((f) => f.description.trim() && f.amount)
          .map((f) => ({
            description: f.description,
            amount: f.amount,
            currencyCode: f.currencyCode,
            fxRateToCollectionCurrency: f.fx,
          })),
      ),
    [fees],
  );
  return { allocationsJson, feesJson };
}

type PropsCreate = {
  formAction: (s: ActionState | null, f: FormData) => Promise<ActionState>;
  sales: ImputableSaleRow[];
  defaultCollectionDate: string;
};
type PropsEdit = {
  formAction: (s: ActionState | null, f: FormData) => Promise<ActionState>;
  sales: ImputableSaleRow[];
  listHref: string;
  defaultValues: {
    collectionDate: string;
    currencyCode: "ARS" | "USD";
    grossAmount: string;
    paymentMethodCode: string;
    notes: string;
    checkNumber: string;
    checkBankLabel: string;
    fxRateArsPerUnitUsdAtCollection: string;
    allocationRows: { saleId: string; amount: string; fx: string }[];
    feeRows: { description: string; amount: string; currencyCode: "ARS" | "USD"; fx: string }[];
  };
};

export function CollectionFormCreate({ formAction, sales, defaultCollectionDate }: PropsCreate) {
  const [state, action] = useFormState(formAction, null);
  const [allocs, setAllocs] = useState<AllocRow[]>([emptyAlloc()]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [ccy, setCcy] = useState<"ARS" | "USD">("ARS");
  const { allocationsJson, feesJson } = useJsonSerializers(allocs, fees);
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
      {state?.success ? (
        <Alert>
          <AlertDescription>Guardado.</AlertDescription>
        </Alert>
      ) : null}
      <FormFields
        sales={sales}
        ccy={ccy}
        onCcy={setCcy}
        allocs={allocs}
        setAllocs={setAllocs}
        fees={fees}
        setFees={setFees}
        allocationsJson={allocationsJson}
        feesJson={feesJson}
        listHref="/operaciones/cobranzas"
        submitLabel="Guardar cobranza"
        defaultArsFx=""
        defaultGross=""
        defaultDate={defaultCollectionDate}
        defaultPayment=""
        defaultNotes=""
        defaultCheckNumber=""
        defaultCheckBankLabel=""
      />
    </form>
  );
}

export function CollectionFormEdit({ formAction, sales, listHref, defaultValues }: PropsEdit) {
  const [state, action] = useFormState(formAction, null);
  const [allocs, setAllocs] = useState<AllocRow[]>(
    defaultValues.allocationRows.map((r) => ({ key: newKey(), ...r })),
  );
  const [fees, setFees] = useState<FeeRow[]>(
    defaultValues.feeRows.length
      ? defaultValues.feeRows.map((f) => ({ key: newKey(), ...f }))
      : [],
  );
  const [ccy, setCcy] = useState<"ARS" | "USD">(defaultValues.currencyCode);
  const { allocationsJson, feesJson } = useJsonSerializers(allocs, fees);
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
      {state?.success ? <Alert><AlertDescription>{(state as { message?: string }).message}</AlertDescription></Alert> : null}
      <FormFields
        sales={sales}
        ccy={ccy}
        onCcy={setCcy}
        allocs={allocs}
        setAllocs={setAllocs}
        fees={fees}
        setFees={setFees}
        allocationsJson={allocationsJson}
        feesJson={feesJson}
        listHref={listHref}
        submitLabel="Guardar cambios"
        defaultArsFx={defaultValues.fxRateArsPerUnitUsdAtCollection}
        defaultGross={defaultValues.grossAmount}
        defaultDate={defaultValues.collectionDate}
        defaultPayment={defaultValues.paymentMethodCode}
        defaultNotes={defaultValues.notes}
        defaultCheckNumber={defaultValues.checkNumber}
        defaultCheckBankLabel={defaultValues.checkBankLabel}
      />
    </form>
  );
}

function FormFields({
  sales,
  ccy,
  onCcy,
  allocs,
  setAllocs,
  fees,
  setFees,
  allocationsJson,
  feesJson,
  listHref,
  submitLabel,
  defaultArsFx,
  defaultGross,
  defaultDate,
  defaultPayment,
  defaultNotes,
  defaultCheckNumber,
  defaultCheckBankLabel,
}: {
  sales: ImputableSaleRow[];
  ccy: "ARS" | "USD";
  onCcy: (c: "ARS" | "USD") => void;
  allocs: AllocRow[];
  setAllocs: (v: AllocRow[] | ((a: AllocRow[]) => AllocRow[])) => void;
  fees: FeeRow[];
  setFees: (v: FeeRow[] | ((a: FeeRow[]) => FeeRow[])) => void;
  allocationsJson: string;
  feesJson: string;
  listHref: string;
  submitLabel: string;
  defaultArsFx: string;
  defaultGross: string;
  defaultDate: string;
  defaultPayment: string;
  defaultNotes: string;
  defaultCheckNumber: string;
  defaultCheckBankLabel: string;
}) {
  const saleById = useMemo(() => new Map(sales.map((s) => [s.id, s])), [sales]);
  return (
    <>
      <input type="hidden" name="allocationsJson" value={allocationsJson} />
      <input type="hidden" name="feesJson" value={feesJson} />
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="collectionDate">Fecha de cobranza</Label>
          <Input id="collectionDate" name="collectionDate" type="date" required defaultValue={defaultDate} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="grossAmount">Importe bruto (moneda de cobranza)</Label>
          <Input
            id="grossAmount"
            name="grossAmount"
            defaultValue={defaultGross}
            inputMode="decimal"
            required
            placeholder="0,00"
          />
        </div>
      </div>
      <div className="grid max-w-xs gap-2">
        <Label htmlFor="ccy">Moneda de registro de la cobranza</Label>
        <input type="hidden" name="currencyCode" value={ccy} />
        <select
          id="ccy"
          className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
          value={ccy}
          onChange={(e) => onCcy(e.target.value as "ARS" | "USD")}
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
        {ccy === "USD" ? (
          <div className="mt-1 grid gap-1">
            <Label htmlFor="fxRateArsPerUnitUsdAtCollection">Tasa: ARS por 1 USD</Label>
            <Input
              id="fxRateArsPerUnitUsdAtCollection"
              name="fxRateArsPerUnitUsdAtCollection"
              defaultValue={defaultArsFx}
              inputMode="decimal"
              required
            />
          </div>
        ) : (
          <input type="hidden" name="fxRateArsPerUnitUsdAtCollection" value="" />
        )}
      </div>
      <div className="grid gap-2 sm:max-w-md">
        <Label htmlFor="paymentMethodCode">Método de cobro (opcional)</Label>
        <Input
          id="paymentMethodCode"
          name="paymentMethodCode"
          placeholder="Efectivo, transferencia, tarjeta…"
          defaultValue={defaultPayment}
          maxLength={80}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="checkNumber">Nº de cheque (opcional)</Label>
          <Input
            id="checkNumber"
            name="checkNumber"
            placeholder="Solo si aplica"
            defaultValue={defaultCheckNumber}
            maxLength={64}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="checkBankLabel">Banco (opcional)</Label>
          <Input
            id="checkBankLabel"
            name="checkBankLabel"
            placeholder="Nombre del banco emisor"
            defaultValue={defaultCheckBankLabel}
            maxLength={200}
          />
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Imputación a ventas</h2>
          <p className="text-muted-foreground text-sm">
            Suma (en moneda de la cobranza) ≤ bruto. Si la venta es otra moneda, indicá la tasa: unidades de
            moneda de la venta por 1 unidad de moneda de la cobranza.
          </p>
        </div>
        {allocs.map((row, i) => {
          const s = row.saleId ? saleById.get(row.saleId) : undefined;
          const needFx = s != null && s.currencyCode !== ccy;
          return (
            <div
              key={row.key}
              className="border-border bg-card/30 grid gap-3 rounded-lg border p-3 sm:grid-cols-12 sm:items-end"
            >
              <div className="sm:col-span-5">
                <Label>Venta {i + 1}</Label>
                <select
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  value={row.saleId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAllocs((prev) =>
                      prev.map((a) => (a.key === row.key ? { ...a, saleId: id, fx: "" } : a)),
                    );
                  }}
                >
                  <option value="">(elegir)</option>
                  {sales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayLabel} — {s.totalAmount} {s.currencyCode} (pend. {s.pendingInSaleCurrency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <Label>Monto (mon. cobranza)</Label>
                <Input
                  className="mt-1"
                  value={row.amount}
                  onChange={(e) =>
                    setAllocs((prev) =>
                      prev.map((a) => (a.key === row.key ? { ...a, amount: e.target.value } : a)),
                    )
                  }
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              {needFx ? (
                <div className="sm:col-span-3">
                  <Label>Tasa → venta ({s!.currencyCode}/1{ccy})</Label>
                  <Input
                    className="mt-1"
                    value={row.fx}
                    onChange={(e) =>
                      setAllocs((prev) =>
                        prev.map((a) => (a.key === row.key ? { ...a, fx: e.target.value } : a)),
                      )
                    }
                    inputMode="decimal"
                    required
                    placeholder="Ej. ARS/USD 1200"
                  />
                </div>
              ) : s ? (
                <input type="hidden" className="hidden" readOnly value="" />
              ) : null}
              <div className="flex sm:col-span-1 sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setAllocs((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.key !== row.key)))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setAllocs((a) => [...a, emptyAlloc()])}
        >
          <Plus className="mr-1 h-4 w-4" />
          Línea de imputación
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Gastos de cobranza (opcional)</h2>
          <p className="text-muted-foreground text-sm">
            Comisiones, retenciones, etc. Neto = bruto − total de gastos convertido a moneda de cobranza.
          </p>
        </div>
        {fees.map((row) => (
          <div
            key={row.key}
            className="border-border grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4 sm:items-end"
          >
            <div>
              <Label>Descripción</Label>
              <Input
                value={row.description}
                onChange={(e) =>
                  setFees((f) => f.map((r) => (r.key === row.key ? { ...r, description: e.target.value } : r)))
                }
              />
            </div>
            <div>
              <Label>Importe</Label>
              <Input
                value={row.amount}
                onChange={(e) =>
                  setFees((f) => f.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)))
                }
                inputMode="decimal"
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <select
                className="border-input h-9 w-full rounded-md border px-2 text-sm"
                value={row.currencyCode}
                onChange={(e) =>
                  setFees((f) =>
                    f.map((r) =>
                      r.key === row.key
                        ? { ...r, currencyCode: e.target.value as "ARS" | "USD" }
                        : r,
                    ),
                  )
                }
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Tasa → cobranza (mon. cobranza / 1 unidad de mon. gasto)</Label>
                <Input
                  value={row.fx}
                  onChange={(e) => setFees((f) => f.map((r) => (r.key === row.key ? { ...r, fx: e.target.value } : r)))}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => setFees((f) => f.filter((x) => x.key !== row.key))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setFees((f) => [...f, emptyFee()])}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar gasto
        </Button>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Input id="notes" name="notes" defaultValue={defaultNotes} maxLength={4000} />
      </div>
      <div className="flex flex-wrap gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={listHref}>Cancelar</Link>
        </Button>
      </div>
    </>
  );
}
