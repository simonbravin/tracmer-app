"use client";

import { useEffect, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ORGANIZATION_TIMEZONE_LABELS,
  ORGANIZATION_TIMEZONE_VALUES,
} from "@/lib/organization/timezones";
import { updateOrganizationSettings } from "@/lib/organization/actions";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors",
  "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

type Defaults = {
  name: string;
  legalName: string;
  timezone: string;
};

export function OrganizationSettingsForm({
  canEdit,
  defaultValues,
}: {
  canEdit: boolean;
  defaultValues: Defaults;
}) {
  const r = useRouter();
  const [state, action] = useFormState(updateOrganizationSettings, null);

  useEffect(() => {
    if (state?.success) {
      r.refresh();
    }
  }, [state, r]);

  const timezoneOptions = useMemo(() => {
    const base = [...ORGANIZATION_TIMEZONE_VALUES] as string[];
    if (defaultValues.timezone && !base.includes(defaultValues.timezone)) {
      return [defaultValues.timezone, ...base];
    }
    return base;
  }, [defaultValues.timezone]);

  if (!canEdit) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-muted-foreground rounded-md border p-4 text-sm">
          Solo el <strong>propietario</strong> de la organización puede modificar estos datos. Si necesitás un
          cambio, pedile al propietario que lo haga desde esta pantalla.
        </p>
        <ReadOnlyBlock defaultValues={defaultValues} />
      </div>
    );
  }

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

      <EditableFields defaultValues={defaultValues} timezoneOptions={timezoneOptions} />
      <SubmitButton />
    </form>
  );
}

function ReadOnlyBlock({ defaultValues }: { defaultValues: Defaults }) {
  const tzLabel =
    (ORGANIZATION_TIMEZONE_LABELS as Record<string, string>)[defaultValues.timezone] ??
    defaultValues.timezone;
  return (
    <div className="space-y-4 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-2">
        <Label>Nombre</Label>
        <p className="text-sm">{defaultValues.name}</p>
      </div>
      <div className="grid gap-2">
        <Label>Razón social</Label>
        <p className="text-sm">{defaultValues.legalName?.trim() ? defaultValues.legalName : "—"}</p>
      </div>
      <div className="grid gap-2">
        <Label>Zona horaria</Label>
        <p className="text-sm">{tzLabel}</p>
      </div>
    </div>
  );
}

function EditableFields({
  defaultValues,
  timezoneOptions,
}: {
  defaultValues: Defaults;
  timezoneOptions: string[];
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="org-name">Nombre de la organización</Label>
        <Input
          id="org-name"
          name="name"
          required
          minLength={1}
          maxLength={200}
          defaultValue={defaultValues.name}
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-legal">Razón social (opcional)</Label>
        <Input
          id="org-legal"
          name="legalName"
          maxLength={500}
          defaultValue={defaultValues.legalName}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-tz">Zona horaria</Label>
        <select
          id="org-tz"
          name="timezone"
          className={selectClassName}
          defaultValue={defaultValues.timezone}
          required
        >
          {timezoneOptions.map((tz) => {
            const label = (ORGANIZATION_TIMEZONE_LABELS as Record<string, string>)[tz] ?? tz;
            return (
              <option key={tz} value={tz}>
                {label}
              </option>
            );
          })}
        </select>
        <p className="text-muted-foreground text-xs">
          Se usa como referencia para fechas y reportes en la app.
        </p>
      </div>
    </>
  );
}
