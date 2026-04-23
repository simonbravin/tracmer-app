"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm({ showGoogle }: { showGoogle: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrlRaw = searchParams.get("callbackUrl");
  const safeAfter =
    callbackUrlRaw && callbackUrlRaw.startsWith("/") && !callbackUrlRaw.startsWith("//")
      ? callbackUrlRaw
      : "/tablero";
  const inviteEmail = searchParams.get("inviteEmail");

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail);
    }
  }, [inviteEmail]);
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo crear la cuenta.");
        setLoading(false);
        return;
      }
      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        setMessage("Cuenta creada. Iniciá sesión manualmente.");
        setLoading(false);
        return;
      }
      router.push(safeAfter);
      router.refresh();
    } catch {
      setMessage("Error de red. Intentá de nuevo.");
    }
    setLoading(false);
  }

  return (
    <AuthCard
      title="Crear cuenta"
      description="Registro con correo y contraseña (mínimo 8 caracteres)."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
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
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando…" : "Registrarme"}
        </Button>
        {showGoogle ? (
          <p className="text-center text-xs text-muted-foreground">
            Podés usar{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => void signIn("google", { callbackUrl: "/tablero" })}
            >
              Google
            </button>{" "}
            desde la pantalla de inicio de sesión.
          </p>
        ) : null}
      </form>
    </AuthCard>
  );
}
