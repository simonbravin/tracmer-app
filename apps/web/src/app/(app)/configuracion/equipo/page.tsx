import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InviteMemberForm } from "@/components/configuracion/invite-member-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { prisma } from "@tracmer-app/database";

export const metadata: Metadata = {
  title: "Equipo",
};

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.primaryMembership || !ctx.organization) {
    redirect("/onboarding/empresa");
  }

  const orgId = ctx.organization.id;
  const canInvite = ctx.primaryMembership.role.code === "owner" || ctx.primaryMembership.role.code === "admin";

  const [members, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: orgId, deletedAt: null, status: "active" },
      include: {
        user: { select: { email: true, name: true, displayName: true } },
        role: { select: { code: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.membershipInvitation.findMany({
      where: {
        organizationId: orgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { role: { select: { code: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="text-muted-foreground">Miembros de {ctx.organization.name} e invitaciones pendientes.</p>
      </div>

      {canInvite ? <InviteMemberForm /> : null}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Miembros</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No hay miembros.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.user.email}</TableCell>
                    <TableCell>{m.user.displayName ?? m.user.name ?? "—"}</TableCell>
                    <TableCell>{m.role.displayName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Invitaciones pendientes</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Vence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No hay invitaciones vigentes.
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{inv.role.displayName}</TableCell>
                    <TableCell>{inv.expiresAt.toLocaleDateString("es-AR")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
