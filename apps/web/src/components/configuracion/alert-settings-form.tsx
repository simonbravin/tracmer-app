"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONFIGURABLE_EMAIL_ALERT_TYPES } from "@/lib/alert-settings/constants";
import {
  sendTestAlertSettingsEmail,
  updateOrganizationAlertSettings,
  type AlertSettingsActionState,
} from "@/lib/alert-settings/actions";
import { defaultCheckedTypes, type OrganizationAlertSettingsDTO } from "@/lib/alert-settings/data";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {children}
    </Button>
  );
}

function TestEmailButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Enviando…" : "Enviar correo de prueba"}
    </Button>
  );
}

type Props = {
  canManage: boolean;
  initial: OrganizationAlertSettingsDTO;
};

function AlertBlock({ state }: { state: AlertSettingsActionState | null }) {
  if (state == null) return null;
  if (state.success === false) {
    return (
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
    );
  }
  return (
    <Alert>
      <AlertDescription>{(state as { message?: string }).message}</AlertDescription>
    </Alert>
  );
}

export function OrganizationAlertSettingsForm({ canManage, initial }: Props) {
  const checked = defaultCheckedTypes(initial);
  const [state, action] = useFormState(updateOrganizationAlertSettings, null);
  const [testState, testAction] = useFormState(sendTestAlertSettingsEmail, null);

  if (!canManage) {
    return (
      <p className="text-muted-foreground rounded-md border p-4 text-sm">
        Solo perfiles con permiso de <code className="text-xs">settings.manage</code> (propietario y administrador
        por defecto) pueden cambiar estas preferencias.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form action={action} className="space-y-4">
        <AlertBlock state={state} />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="emailEnabled"
            name="emailEnabled"
            value="true"
            defaultChecked={initial.emailEnabled}
            className="border-input h-4 w-4 rounded"
          />
          <Label htmlFor="emailEnabled" className="cursor-pointer font-medium">
            Notificaciones por email
          </Label>
        </div>
        <p className="text-muted-foreground text-sm">
          Cuando el envío automático esté en producción, usaremos estos destinatarios y tipos. Guardá la configuración
          antes de probar.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="emailRecipients">Destinatarios (uno por línea o separados por coma)</Label>
          <Textarea
            id="emailRecipients"
            name="emailRecipients"
            defaultValue={initial.emailRecipients}
            rows={3}
            placeholder="finanzas@empresa.com, cfo@empresa.com"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>Tipos de alerta a incluir en el email</Label>
          <ul className="space-y-2">
            {CONFIGURABLE_EMAIL_ALERT_TYPES.map((c) => (
              <li key={c.type} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="emailTypes"
                  value={c.type}
                  id={`t-${c.type}`}
                  defaultChecked={checked.includes(c.type)}
                  className="border-input mt-1 h-4 w-4 rounded"
                />
                <div>
                  <label htmlFor={`t-${c.type}`} className="cursor-pointer text-sm font-medium">
                    {c.label}
                  </label>
                  <p className="text-muted-foreground text-xs">{c.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <SubmitButton>Guardar</SubmitButton>
      </form>

      <div className="space-y-2 rounded-md border p-3">
        <Label className="text-sm font-medium">Probar envío (Resend)</Label>
        <p className="text-muted-foreground mb-2 text-xs">Envía un mail de prueba al primer destinatario guardado (requiere RESEND_* en el servidor).</p>
        <form action={testAction} className="space-y-2">
          {testState ? <AlertBlock state={testState} /> : null}
          <TestEmailButton />
        </form>
      </div>
    </div>
  );
}
