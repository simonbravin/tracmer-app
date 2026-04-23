"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LoginForm({ showGoogle }: { showGoogle: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/tablero";
  const error = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (error) {
      setMessage("No se pudo iniciar sesión. Revisá tus datos o probá de nuevo.");
    }
  }, [error]);

  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setMessage("Correo o contraseña incorrectos.");
      return;
    }
    router.push(callbackUrl.startsWith("/") ? callbackUrl : "/tablero");
    router.refresh();
  }

  return (
    <AuthCard
      title="Iniciar sesión"
      description="Accedé con Google o con tu correo y contraseña."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-primary underline-offset-4 hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {showGoogle ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                void signIn("google", { callbackUrl });
              }}
            >
              Continuar con Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o con correo</span>
              </div>
            </div>
          </>
        ) : null}

        <form onSubmit={onCredentials} className="space-y-4">
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/login/olvidaste"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Olvidé mi contraseña
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
