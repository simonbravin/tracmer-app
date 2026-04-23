"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { labelSaleStatus, saleStatusesForList } from "@/lib/sales/status";
import type { ActionState } from "@/lib/sales/actions";

type ClientOption = { id: string; displayName: string; legalName: string };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {children}
    </Button>
  );
}

export function SaleFormCreate({
  formAction,
  defaultInvoiceDate,
  clients,
}: {
  formAction: (state: ActionState | null, data: FormData) => Promise<ActionState>;
  defaultInvoiceDate: string;
  clients: ClientOption[];
}) {
  const [state, action] = useFormState(formAction, null);
  return (
    <SaleFormFields
      mode="create"
      action={action}
      state={state}
      submitLabel="Crear factura / venta"
      clients={clients}
      createDefaults={{ invoiceDate: defaultInvoiceDate }}
    />
  );
}

export function SaleFormEdit({
  formAction,
  defaultValues,
  clients,
  listHref,
}: {
  formAction: (state: ActionState | null, data: FormData) => Promise<ActionState>;
  defaultValues: {
    clientId: string;
    invoiceDate: string;
    creditDays: string;
    currencyCode: "ARS" | "USD";
    totalAmount: string;
    fxRateArsPerUnitUsdAtIssue: string;
    invoiceNumber: string;
    status: string;
  };
  clients: ClientOption[];
  listHref: string;
}) {
  const [state, action] = useFormState(formAction, null);
  return (
    <SaleFormFields
      mode="edit"
      action={action}
      state={state}
      submitLabel="Guardar cambios"
      clients={clients}
      listHref={listHref}
      createDefaults={undefined}
      defaultValues={defaultValues}
    />
  );
}

function SaleFormFields({
  mode,
  action,
  state,
  submitLabel,
  clients,
  listHref = "/operaciones/ventas",
  createDefaults,
  defaultValues,
}: {
  mode: "create" | "edit";
  action: (formData: FormData) => void;
  state: ActionState | null;
  submitLabel: string;
  clients: ClientOption[];
  listHref?: string;
  createDefaults?: { invoiceDate: string };
  defaultValues?: {
    clientId: string;
    invoiceDate: string;
    creditDays: string;
    currencyCode: "ARS" | "USD";
    totalAmount: string;
    fxRateArsPerUnitUsdAtIssue: string;
    invoiceNumber: string;
    status: string;
  };
}) {
  const [ccy, setCcy] = useState<"ARS" | "USD">(defaultValues?.currencyCode ?? "ARS");

  if (clients.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        <p>Primero necesitás al menos un cliente en la cartera.</p>
        <Button asChild className="mt-3" variant="secondary">
          <Link href="/clientes/nuevo">Ir a nuevo cliente</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="max-w-2xl space-y-4">
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
          <AlertDescription>
            {mode === "edit" ? (state as { message?: string }).message : "Guardado."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="clientId">Cliente</Label>
        <select
          id="clientId"
          name="clientId"
          className="border-input bg-background ring-offset-background h-9 w-full max-w-md rounded-md border px-2 text-sm shadow-sm"
          required
          defaultValue={defaultValues?.clientId}
        >
          <option value="" disabled>
            Elegir cliente
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName || c.legalName}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="invoiceDate">Fecha de factura</Label>
          <Input
            id="invoiceDate"
            name="invoiceDate"
            type="date"
            required
            defaultValue={defaultValues?.invoiceDate ?? createDefaults?.invoiceDate}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="creditDays">Días de crédito</Label>
          <Input
            id="creditDays"
            name="creditDays"
            type="number"
            min={0}
            step={1}
            defaultValue={defaultValues?.creditDays ?? "0"}
            required
          />
        </div>
      </div>
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="currencyCode">Moneda de la factura</Label>
        <select
          id="currencyCode"
          className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
          value={ccy}
          onChange={(e) => setCcy(e.target.value as "ARS" | "USD")}
        >
          <option value="ARS">ARS — pesos</option>
          <option value="USD">USD — dólares (pedís tasa a ARS)</option>
        </select>
        <input type="hidden" name="currencyCode" value={ccy} />
        <p className="text-muted-foreground text-xs">
          El monto abajo se interpreta en esta moneda. El vencimiento es fecha de factura + días de crédito.
        </p>
      </div>
      {ccy === "USD" ? (
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="fxRateArsPerUnitUsdAtIssue">Tasa: ARS por 1 USD</Label>
          <Input
            id="fxRateArsPerUnitUsdAtIssue"
            name="fxRateArsPerUnitUsdAtIssue"
            inputMode="decimal"
            placeholder="Ej. 1000,50"
            defaultValue={defaultValues?.fxRateArsPerUnitUsdAtIssue ?? ""}
            required
          />
          <p className="text-muted-foreground text-xs">
            Se guarda el equivalente en ARS a la emisión. Cobranzas en otro módulo.
          </p>
        </div>
      ) : (
        <input type="hidden" name="fxRateArsPerUnitUsdAtIssue" value="" />
      )}
      <div className="grid gap-2 sm:max-w-sm">
        <Label htmlFor="totalAmount">Importe total</Label>
        <Input
          id="totalAmount"
          name="totalAmount"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={defaultValues?.totalAmount}
          required
        />
      </div>
      <div className="grid gap-2 sm:max-w-sm">
        <Label htmlFor="invoiceNumber">Número de factura (opcional)</Label>
        <Input
          id="invoiceNumber"
          name="invoiceNumber"
          defaultValue={defaultValues?.invoiceNumber}
          maxLength={120}
        />
      </div>
      {mode === "create" ? (
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="status">Estado al guardar</Label>
          <select
            id="status"
            name="status"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
            defaultValue="draft"
          >
            <option value="draft">{labelSaleStatus("draft")}</option>
            <option value="issued">{labelSaleStatus("issued")}</option>
          </select>
        </div>
      ) : (
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            name="status"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-sm"
            defaultValue={defaultValues?.status}
          >
            {saleStatusesForList.map((s) => (
              <option key={s} value={s}>
                {labelSaleStatus(s)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={listHref}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
