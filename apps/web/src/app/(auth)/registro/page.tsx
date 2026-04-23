import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth-env";

export const dynamic = "force-dynamic";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const raw = sp.callbackUrl;
  const callbackUrl = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const safeAfter =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/tablero";
  if (session?.user) {
    redirect(safeAfter);
  }
  const showGoogle = isGoogleOAuthConfigured();
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <RegisterForm showGoogle={showGoogle} />
    </Suspense>
  );
}
