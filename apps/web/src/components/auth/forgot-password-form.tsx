"use client";

import * as React from "react";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el correo.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    }
    setLoading(false);
  }

  return (
    <AuthCard
      title="Olvidé mi contraseña"
      description="Te enviamos un enlace para restablecerla (si el correo está registrado con contraseña)."
      footer={
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Volver al inicio de sesión
        </Link>
      }
    >
      {done ? (
        <p className="text-sm text-muted-foreground">
          Si el correo existe en el sistema, recibirás instrucciones en unos minutos. Revisá también
          spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
