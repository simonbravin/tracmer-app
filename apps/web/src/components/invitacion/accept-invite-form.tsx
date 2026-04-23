"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Uniéndote…" : "Unirme a la organización"}
    </Button>
  );
}

export function AcceptInviteForm({
  token,
  action,
  organizationName,
}: {
  token: string;
  action: (prev: { error?: string } | undefined, formData: FormData) => Promise<{ error?: string }>;
  organizationName: string;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <AuthCard
      title="Invitación"
      description={`Te invitaron a "${organizationName}". Confirmá para unirte con tu cuenta actual.`}
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton />
        <Button type="button" variant="outline" className="w-full" asChild>
          <Link href="/login">Usar otra cuenta</Link>
        </Button>
      </form>
    </AuthCard>
  );
}
