"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/collections/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Procesando…" : "Confirmar anulación"}
    </Button>
  );
}

export function VoidCollectionForm({
  formAction,
}: {
  formAction: (s: ActionState | null, f: FormData) => Promise<ActionState>;
}) {
  const [state, action] = useFormState(formAction, null);
  return (
    <form action={action} className="max-w-md space-y-3">
      {state?.success === false ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? <Alert><AlertDescription>{(state as { message?: string }).message}</AlertDescription></Alert> : null}
      <div className="grid gap-2">
        <Label htmlFor="voidReason">Motivo (obligatorio para auditoría)</Label>
        <Input id="voidReason" name="voidReason" required minLength={3} maxLength={2000} placeholder="Ej. error de carga, acuerdo con cliente" />
      </div>
      <Submit />
    </form>
  );
}
