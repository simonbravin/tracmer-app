import type { Metadata } from "next";
import Link from "next/link";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ClientFormCreate } from "@/components/clients/client-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { createClient } from "@/lib/clients/actions";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NuevoClientePage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/clientes">
            <ChevronLeft className="h-4 w-4" />
            Volver a clientes
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/clientes" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Clientes
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo cliente</h1>
        <p className="text-muted-foreground text-sm">Datos mínimos para el CRM.</p>
      </div>
      <ClientFormCreate formAction={createClient} />
    </div>
  );
}
