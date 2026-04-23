import Link from "next/link";

import { auth } from "@/auth";
import { AcceptInviteForm } from "@/components/invitacion/accept-invite-form";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { hashInvitationToken } from "@/lib/membership-invitations/hash-token";
import { prisma } from "@tracmer-app/database";

import { acceptInviteFormAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvitacionAceptarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.token;
  const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  if (!token?.trim()) {
    return (
      <div className="mx-auto max-w-md py-12">
        <AuthCard title="Invitación" description="Falta el enlace completo. Pedí que te reenvíen la invitación.">
          <p className="text-sm text-muted-foreground"> </p>
        </AuthCard>
      </div>
    );
  }

  const tokenHash = hashInvitationToken(token.trim());
  const inv = await prisma.membershipInvitation.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
    },
    include: { organization: true },
  });

  if (!inv) {
    return (
      <div className="mx-auto max-w-md py-12">
        <AuthCard title="Invitación" description="El enlace no es válido o fue revocado.">
          <p className="text-sm text-muted-foreground"> </p>
        </AuthCard>
      </div>
    );
  }

  if (inv.acceptedAt) {
    return (
      <div className="mx-auto max-w-md py-12">
        <AuthCard title="Invitación" description="Esta invitación ya fue aceptada. Iniciá sesión para entrar a la app.">
          <p className="text-sm text-muted-foreground"> </p>
        </AuthCard>
        <div className="mx-auto mt-4 max-w-md text-center">
          <Button asChild>
            <Link href="/login">Ir a iniciar sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (inv.expiresAt < new Date()) {
    return (
      <div className="mx-auto max-w-md py-12">
        <AuthCard title="Invitación vencida" description="Pedí al administrador que te envíe una nueva invitación.">
          <p className="text-sm text-muted-foreground"> </p>
        </AuthCard>
      </div>
    );
  }

  const session = await auth();
  const acceptPath = `/invitacion/aceptar?token=${encodeURIComponent(token)}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(acceptPath)}`;
  const registerHref = `/registro?inviteEmail=${encodeURIComponent(inv.email)}&callbackUrl=${encodeURIComponent(acceptPath)}`;

  if (!session?.user?.email) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 py-12">
        <AuthCard
          title="Invitación"
          description={`Te invitaron a "${inv.organization.name}". Iniciá sesión o creá una cuenta con el correo ${inv.email} para aceptar.`}
        >
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href={loginHref}>Iniciar sesión</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={registerHref}>Crear cuenta</Link>
            </Button>
          </div>
        </AuthCard>
      </div>
    );
  }

  const sessionEmail = session.user.email.trim().toLowerCase();
  if (sessionEmail !== inv.email.toLowerCase()) {
    return (
      <div className="mx-auto max-w-md py-12">
        <AuthCard
          title="Otro correo"
          description={`Esta invitación es para ${inv.email}. Estás conectado como ${session.user.email}. Cerrá sesión e ingresá con el correo correcto.`}
        >
          <Button variant="outline" className="w-full" asChild>
            <Link href={loginHref}>Ir a iniciar sesión</Link>
          </Button>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <AcceptInviteForm token={token} action={acceptInviteFormAction} organizationName={inv.organization.name} />
    </div>
  );
}
