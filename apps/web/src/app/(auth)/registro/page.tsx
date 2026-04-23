import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/tablero");
  }
  const showGoogle = !!(
    process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()
  );
  return <RegisterForm showGoogle={showGoogle} />;
}
