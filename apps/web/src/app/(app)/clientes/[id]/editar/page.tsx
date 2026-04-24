import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ClientFormEdit } from "@/components/clients/client-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getClientById } from "@/lib/clients/data";
import { updateClient, type ActionState } from "@/lib/clients/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar cliente</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/clientes">Volver a clientes</Link>
        </Button>
      </div>
    );
  }
  const c = await getClientById(ctx.currentOrganizationId, id);
  if (!c) notFound();
  if (c.deletedAt) {
    notFound();
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href={`/clientes/${c.id}`} className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            {c.legalName}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar cliente</h1>
      </div>
      <ClientFormEdit
        formAction={
          updateClient.bind(
            null,
            c.id,
          ) as (a: ActionState | null, f: FormData) => Promise<ActionState>
        }
        defaultValues={{
          legalName: c.legalName,
          displayName: c.displayName,
          taxId: c.taxId ?? "",
          address: c.address ?? "",
          phone: c.phone ?? "",
          email: c.email ?? "",
          website: c.website ?? "",
          contactName: c.contactName ?? "",
          notes: c.notes ?? "",
        }}
      />
    </div>
  );
}
