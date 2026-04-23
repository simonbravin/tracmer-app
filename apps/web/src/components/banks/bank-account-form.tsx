"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/banks/actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {children}
    </Button>
  );
}

type FormAccountAction = (state: ActionState | null, data: FormData) => Promise<ActionState>;

function FormInner({
  state,
  submitLabel,
  backHref,
  defaultValues,
}: {
  state: ActionState | null;
  submitLabel: string;
  backHref: string;
  defaultValues?: {
    name: string;
    bankName: string;
    currencyCode: "ARS" | "USD";
    accountIdentifierMasked: string;
    isActive: boolean;
  };
}) {
  return (
    <>
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
          <AlertDescription>{(state as { message?: string }).message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre de la cuenta</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bankName">Banco</Label>
        <Input
          id="bankName"
          name="bankName"
          required
          defaultValue={defaultValues?.bankName}
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currencyCode">Moneda de la cuenta</Label>
        <select
          id="currencyCode"
          name="currencyCode"
          defaultValue={defaultValues?.currencyCode ?? "ARS"}
          className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-2 text-sm shadow-sm"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="accountIdentifierMasked">Referencia / Nº de cuenta (visible, puede estar enmascarada)</Label>
        <Input
          id="accountIdentifierMasked"
          name="accountIdentifierMasked"
          required
          defaultValue={defaultValues?.accountIdentifierMasked}
          maxLength={120}
        />
        <p className="text-muted-foreground text-xs">Texto de referencia para identificar la cuenta; no hace falta el CBU completo.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="isActive">Estado operativo</Label>
        <select
          id="isActive"
          name="isActive"
          defaultValue={defaultValues && !defaultValues.isActive ? "false" : "true"}
          className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-2 text-sm shadow-sm"
        >
          <option value="true">Activa (operativa)</option>
          <option value="false">Inactiva</option>
        </select>
        <p className="text-muted-foreground text-xs">Inactiva: no se usa en depósitos nuevos. Archivar la cuenta: desde el detalle.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>Cancelar</Link>
        </Button>
      </div>
    </>
  );
}

export function BankAccountFormCreate({
  formAction,
}: {
  formAction: FormAccountAction;
}) {
  const [state, action] = useFormState(formAction, null);
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <FormInner
        state={state}
        submitLabel="Crear cuenta"
        backHref="/bancos/cuentas"
      />
    </form>
  );
}

export function BankAccountFormEdit({
  formAction,
  backHref,
  defaultValues,
}: {
  formAction: FormAccountAction;
  backHref: string;
  defaultValues: {
    name: string;
    bankName: string;
    currencyCode: "ARS" | "USD";
    accountIdentifierMasked: string;
    isActive: boolean;
  };
}) {
  const [state, action] = useFormState(formAction, null);
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <FormInner
        state={state}
        submitLabel="Guardar cambios"
        backHref={backHref}
        defaultValues={defaultValues}
      />
    </form>
  );
}
