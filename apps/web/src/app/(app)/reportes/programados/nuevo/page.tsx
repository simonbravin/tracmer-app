import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ScheduleForm } from "@/components/reports/schedule-form";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listBankAccountsForFilter } from "@/lib/banks/data";
import { listActiveClients } from "@/lib/sales/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nueva programación" };

export default async function NuevaProgramacionPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Nueva programación</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/reportes/programados">Volver</Link>
        </Button>
      </div>
    );
  }
  const [clients, accounts] = await Promise.all([
    listActiveClients(ctx.currentOrganizationId),
    listBankAccountsForFilter(ctx.currentOrganizationId),
  ]);
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href="/reportes/programados" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Reportes programados
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva programación</h1>
        <p className="text-muted-foreground text-sm">
          Se requiere <code className="text-xs">RESEND_API_KEY</code> y un remitente <code className="text-xs">RESEND_FROM</code> en el
          servidor para el envío real.
        </p>
      </div>
      <ScheduleForm
        mode="create"
        clients={clients.map((c) => ({ id: c.id, displayName: c.displayName }))}
        bankAccounts={accounts.map((a) => ({
          id: a.id,
          label: `${a.name} (${a.currencyCode})`,
        }))}
        defaultValues={{}}
      />
    </div>
  );
}
