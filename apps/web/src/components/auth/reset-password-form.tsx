"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!token) {
      setMessage("Falta el token del enlace. Pedí un correo nuevo.");
      return;
    }
    if (password !== password2) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo actualizar la contraseña.");
        setLoading(false);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setMessage("Error de red. Intentá de nuevo.");
    }
    setLoading(false);
  }

  return (
    <AuthCard
      title="Nueva contraseña"
      description="Elegí una contraseña segura (mínimo 8 caracteres)."
      footer={
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Ir al inicio de sesión
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password2">Repetir contraseña</Label>
          <Input
            id="password2"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading || !token}>
          {loading ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </AuthCard>
  );
}
