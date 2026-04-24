import type { Metadata } from "next";

import { UserProfileForm } from "@/components/configuracion/user-profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Perfil",
};

function displayNameHeading(u: {
  name: string | null;
  displayName: string | null;
  email: string;
}): string {
  if (u.displayName?.trim()) return u.displayName.trim();
  if (u.name?.trim()) return u.name.trim();
  return u.email;
}

export default async function PerfilPage() {
  const ctx = await getAppRequestContext();
  if (!ctx) {
    redirect("/login");
  }
  const u = ctx.appUser;
  const m = ctx.primaryMembership;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {m ? (
            <>
              {m.role.displayName} en <span className="text-foreground">{m.organization.name}</span>
            </>
          ) : (
            "Datos de tu cuenta"
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{displayNameHeading(u)}</CardTitle>
          <CardDescription>Identidad y contacto. El email de la cuenta es solo lectura.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfileForm
            defaultValues={{
              name: u.name ?? "",
              displayName: u.displayName ?? "",
              email: u.email,
              phone: u.phone ?? "",
              jobTitle: u.jobTitle ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
