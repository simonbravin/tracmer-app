"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/clients/actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {children}
    </Button>
  );
}

export function ClientFormCreate({
  formAction,
}: {
  formAction: (state: ActionState | null, data: FormData) => Promise<ActionState>;
}) {
  const [state, action] = useFormState(formAction, null);
  return (
    <ClientFormFields
      action={action}
      state={state}
      submitLabel="Crear cliente"
    />
  );
}

export function ClientFormEdit({
  formAction,
  defaultValues,
}: {
  formAction: (state: ActionState | null, data: FormData) => Promise<ActionState>;
  defaultValues: {
    legalName: string;
    displayName: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    contactName: string;
    notes: string;
  };
}) {
  const [state, action] = useFormState(formAction, null);
  return (
    <ClientFormFields
      action={action}
      state={state}
      submitLabel="Guardar cambios"
      defaultValues={defaultValues}
    />
  );
}

function formatCuitForInput(s: string) {
  if (!s) return "";
  const d = s.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
  }
  return s;
}

function ClientFormFields({
  action,
  state,
  submitLabel,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  state: ActionState | null;
  submitLabel: string;
  defaultValues?: {
    legalName: string;
    displayName: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    contactName: string;
    notes: string;
  };
}) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!defaultValues && state?.success && (state as { message?: string }).message) {
      ref.current?.reset();
    }
  }, [defaultValues, state]);
  return (
    <form ref={ref} action={action} className="max-w-2xl space-y-4">
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
        <Label htmlFor="legalName">Razón social</Label>
        <Input
          id="legalName"
          name="legalName"
          required
          defaultValue={defaultValues?.legalName}
          maxLength={500}
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="displayName">Nombre a mostrar</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          defaultValue={defaultValues?.displayName}
          maxLength={500}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="taxId">CUIT / CUIL (opcional)</Label>
        <Input
          id="taxId"
          name="taxId"
          placeholder="XX-XXXXXXXX-X"
          defaultValue={defaultValues != null ? formatCuitForInput(defaultValues.taxId) : ""}
        />
        <p className="text-muted-foreground text-xs">11 dígitos; podés con o sin guiones.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="address">Dirección (opcional)</Label>
          <Input
            id="address"
            name="address"
            defaultValue={defaultValues?.address ?? ""}
            maxLength={2000}
            autoComplete="street-address"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ""}
            maxLength={100}
            autoComplete="tel"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email (opcional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            maxLength={500}
            autoComplete="email"
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="website">Sitio web (opcional)</Label>
          <Input
            id="website"
            name="website"
            placeholder="https://"
            defaultValue={defaultValues?.website ?? ""}
            maxLength={500}
            autoComplete="url"
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="contactName">Persona de contacto (opcional)</Label>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={defaultValues?.contactName ?? ""}
            maxLength={300}
            autoComplete="name"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
          rows={4}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/clientes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
