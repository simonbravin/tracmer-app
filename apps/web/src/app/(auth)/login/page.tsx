import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const raw = sp.callbackUrl;
  const callbackUrl = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/tablero";
  if (session?.user) {
    redirect(safeCallback);
  }
  const showGoogle = !!(
    process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()
  );
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <LoginForm showGoogle={showGoogle} />
    </Suspense>
  );
}
