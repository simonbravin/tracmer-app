import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ArchiveClientButton } from "@/components/clients/archive-client-button";
import { ClientContactsSection } from "@/components/clients/client-contacts-section";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getClientById } from "@/lib/clients/data";
import { dateTimeAr, formatTaxId } from "@/lib/clients/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) return { title: "Cliente" };
  const c = await getClientById(ctx.currentOrganizationId, id);
  if (!c) return { title: "Cliente" };
  return { title: c.displayName || c.legalName };
}

export default async function ClienteDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Cliente</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/clientes">Volver a clientes</Link>
        </Button>
      </div>
    );
  }
  const c = await getClientById(ctx.currentOrganizationId, id);
  if (!c) notFound();
  const archived = c.deletedAt != null;
  const canEdit = !archived;
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
          <Link href="/clientes" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Clientes
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{c.legalName}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">{c.displayName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {archived ? (
                <Badge variant="secondary">Archivado</Badge>
              ) : (
                <Badge variant="outline">Activo</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={`/clientes/${c.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
            {canEdit ? <ArchiveClientButton clientId={c.id} legalName={c.legalName} /> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">CUIT / CUIL: </span>
              <span className="font-mono">{formatTaxId(c.taxId)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Dirección: </span>
              {c.address?.trim() ? c.address : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Teléfono: </span>
              {c.phone?.trim() ? c.phone : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {c.email?.trim() ? (
                <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
              ) : (
                "—"
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Web: </span>
              {c.website?.trim() ? (
                <a
                  className="text-primary break-all underline-offset-4 hover:underline"
                  href={c.website.match(/^https?:\/\//i) ? c.website : `https://${c.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.website}
                </a>
              ) : (
                "—"
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Persona de contacto: </span>
              {c.contactName?.trim() ? c.contactName : "—"}
            </p>
            <p className="whitespace-pre-wrap">
              <span className="text-muted-foreground">Notas: </span>
              {c.notes?.trim() ? c.notes : "—"}
            </p>
            <p className="text-muted-foreground">
              Creado {dateTimeAr(c.createdAt)} · Última modificación {dateTimeAr(c.updatedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      <ClientContactsSection
        clientId={c.id}
        canEdit={canEdit}
        contacts={c.contacts.map((x) => ({
          id: x.id,
          name: x.name,
          email: x.email,
          phone: x.phone,
          roleLabel: x.roleLabel,
        }))}
      />
    </div>
  );
}
