"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserProfile } from "@/lib/profile/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      Guardar cambios
    </Button>
  );
}

type DefaultValues = {
  name: string;
  displayName: string;
  email: string;
  phone: string;
  jobTitle: string;
};

export function UserProfileForm({ defaultValues }: { defaultValues: DefaultValues }) {
  const [state, action] = useFormState(updateUserProfile, null);

  return (
    <form action={action} className="max-w-xl space-y-4">
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
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" value={defaultValues.email} readOnly disabled className="bg-muted/50" />
        <p className="text-muted-foreground text-xs">El email de acceso no se modifica desde acá.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues.name}
          maxLength={200}
          autoComplete="name"
          placeholder="Como en el registro u OAuth"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="displayName">Nombre a mostrar</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={defaultValues.displayName}
          maxLength={200}
          autoComplete="nickname"
          placeholder="Cómo te mostramos en la app"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone}
          maxLength={100}
          autoComplete="tel"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="jobTitle">Cargo u ocupación</Label>
        <Input
          id="jobTitle"
          name="jobTitle"
          defaultValue={defaultValues.jobTitle}
          maxLength={200}
        />
      </div>
      <SubmitButton />
    </form>
  );
}
