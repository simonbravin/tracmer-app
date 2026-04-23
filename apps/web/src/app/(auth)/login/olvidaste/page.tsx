import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const dynamic = "force-dynamic";

export default async function OlvidastePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/tablero");
  }
  return <ForgotPasswordForm />;
}
