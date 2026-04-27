"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteMemberForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [roleCode, setRoleCode] = React.useState<"admin" | "operativo">("operativo");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/org/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          roleCode,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo enviar la invitación.");
        setLoading(false);
        return;
      }
      setEmail("");
      setMessage("Invitación enviada por correo.");
      router.refresh();
    } catch {
      setMessage("Error de red. Intentá de nuevo.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-surface transition-shadow duration-200 focus-within:shadow-raised">
      <h2 className="text-lg font-semibold">Invitar por correo</h2>
      <p className="text-sm text-muted-foreground">
        El invitado recibirá un enlace válido por 7 días. Solo puede ser administrador u operativo.
      </p>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Correo</Label>
        <Input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-role">Rol</Label>
        <select
          id="invite-role"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={roleCode}
          onChange={(e) => setRoleCode(e.target.value as "admin" | "operativo")}
        >
          <option value="operativo">Operativo</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      {message ? (
        <p className={`text-sm ${message.startsWith("Invitación enviada") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Enviando…" : "Enviar invitación"}
      </Button>
    </form>
  );
}
