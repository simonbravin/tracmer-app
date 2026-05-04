"use client";

import { useFormState } from "react-dom";

import { createTreasuryLocationAction, type TreasuryActionState } from "@/lib/treasury/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: TreasuryActionState | null = null;

export function TreasuryLocationForm() {
  const [state, action] = useFormState(createTreasuryLocationAction, initial);
  return (
    <form action={action} className="grid max-w-lg gap-4">
      {state && !state.success ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="kind-tl">Tipo</Label>
        <select
          id="kind-tl"
          name="kind"
          required
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="cash">Caja / efectivo</option>
          <option value="electronic_wallet">Billetera electrónica</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name-tl">Nombre</Label>
        <Input id="name-tl" name="displayName" required maxLength={200} placeholder="Ej. Caja chica oficina" />
        {state && !state.success && state.fieldErrors?.displayName ? (
          <p className="text-destructive text-xs">{state.fieldErrors.displayName}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ccy-tl">Moneda</Label>
        <select
          id="ccy-tl"
          name="currencyCode"
          required
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="prov-tl">Proveedor (opcional)</Label>
        <Input id="prov-tl" name="providerCode" maxLength={64} placeholder="Ej. mercadopago" />
      </div>
      <Button type="submit">Crear ubicación</Button>
    </form>
  );
}
