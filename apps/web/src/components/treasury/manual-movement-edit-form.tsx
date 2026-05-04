"use client";

import { useFormState } from "react-dom";

import { updateTreasuryManualMovementAction, type TreasuryActionState } from "@/lib/treasury/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: TreasuryActionState | null = null;

type Loc = { id: string; displayName: string; currencyCode: string };

type Defaults = {
  id: string;
  treasuryLocationId: string;
  movementDate: string;
  amount: string;
  currencyCode: string;
  direction: "inflow" | "outflow";
  memo: string | null;
};

export function ManualMovementEditForm({ locations, defaults }: { locations: Loc[]; defaults: Defaults }) {
  const [state, action] = useFormState(updateTreasuryManualMovementAction, initial);
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <input type="hidden" name="id" value={defaults.id} />
      {state && !state.success ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="loc-mme">Ubicación</Label>
        <select
          id="loc-mme"
          name="treasuryLocationId"
          required
          defaultValue={defaults.treasuryLocationId}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.displayName} ({l.currencyCode})
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="date-mme">Fecha</Label>
        <Input id="date-mme" name="movementDate" type="date" required defaultValue={defaults.movementDate} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amt-mme">Monto</Label>
        <Input id="amt-mme" name="amount" inputMode="decimal" required defaultValue={defaults.amount} placeholder="0,00" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ccy-mme">Moneda</Label>
        <select
          id="ccy-mme"
          name="currencyCode"
          required
          defaultValue={defaults.currencyCode}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dir-mme">Dirección</Label>
        <select
          id="dir-mme"
          name="direction"
          required
          defaultValue={defaults.direction}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="inflow">Ingreso</option>
          <option value="outflow">Egreso</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="memo-mme">Nota (opcional)</Label>
        <Input id="memo-mme" name="memo" maxLength={500} defaultValue={defaults.memo ?? ""} />
      </div>
      <Button type="submit">Guardar cambios</Button>
    </form>
  );
}
