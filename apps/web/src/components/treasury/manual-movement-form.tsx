"use client";

import { useFormState } from "react-dom";

import { createTreasuryManualMovementAction, type TreasuryActionState } from "@/lib/treasury/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: TreasuryActionState | null = null;

type Loc = { id: string; displayName: string; currencyCode: string };

export function ManualMovementForm({ locations }: { locations: Loc[] }) {
  const [state, action] = useFormState(createTreasuryManualMovementAction, initial);
  if (locations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Primero creá una ubicación que no sea cuenta bancaria (caja o billetera) desde Ubicaciones.
      </p>
    );
  }
  return (
    <form action={action} className="grid max-w-lg gap-4">
      {state && !state.success ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="loc-mm">Ubicación</Label>
        <select
          id="loc-mm"
          name="treasuryLocationId"
          required
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.displayName} ({l.currencyCode})
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="date-mm">Fecha</Label>
        <Input id="date-mm" name="movementDate" type="date" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amt-mm">Monto</Label>
        <Input id="amt-mm" name="amount" inputMode="decimal" required placeholder="0,00" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ccy-mm">Moneda</Label>
        <select
          id="ccy-mm"
          name="currencyCode"
          required
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dir-mm">Dirección</Label>
        <select
          id="dir-mm"
          name="direction"
          required
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="inflow">Ingreso</option>
          <option value="outflow">Egreso</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="memo-mm">Nota (opcional)</Label>
        <Input id="memo-mm" name="memo" maxLength={500} />
      </div>
      <Button type="submit">Registrar</Button>
    </form>
  );
}
