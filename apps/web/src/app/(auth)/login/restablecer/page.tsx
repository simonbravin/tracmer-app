import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export default async function RestablecerPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/tablero");
  }
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
