"use client";

import { useFormState, useFormStatus } from "react-dom";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creando…" : "Crear empresa y continuar"}
    </Button>
  );
}

export function CompleteOrgForm({
  action,
}: {
  action: (
    prev: { ok: boolean; error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <AuthCard
      title="Crear tu empresa"
      description="Completá los datos básicos. Vas a ser el propietario (owner) de esta organización en la app."
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Nombre de la empresa</Label>
          <Input id="orgName" name="orgName" required minLength={2} maxLength={200} autoComplete="organization" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legalName">Razón social (opcional)</Label>
          <Input id="legalName" name="legalName" maxLength={300} autoComplete="off" />
        </div>
        {state?.ok === false && state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>
    </AuthCard>
  );
}
