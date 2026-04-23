import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { DeleteScheduleButton } from "@/components/reports/delete-schedule-button";
import { ScheduleForm } from "@/components/reports/schedule-form";
import { Button } from "@/components/ui/button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { listBankAccountsForFilter } from "@/lib/banks/data";
import { getReportScheduleForEdit } from "@/lib/reports/scheduled/data";
import { createScheduleFormSchema, parametersOverrideSchema, storedReportParametersSchema } from "@/lib/reports/scheduled/validation";
import { type ReportKey } from "@/lib/reports/types";
import { listActiveClients } from "@/lib/sales/data";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Editar programación" };
}

export default async function EditarProgramacionPage({ params }: P) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const s = await getReportScheduleForEdit(ctx.currentOrganizationId, id);
  if (!s?.reportDefinition) {
    notFound();
  }
  const p = storedReportParametersSchema.parse(s.reportDefinition.defaultParameters);
  const o = parametersOverrideSchema.parse(s.parametersOverride);
  const emails = s.recipients.map((r) => r.email);
  const draft = {
    name: s.reportDefinition.name,
    reportType: s.reportDefinition.reportType as ReportKey,
    timezone: s.timezone,
    isActive: s.isActive,
    parameters: p,
    schedule: o.schedule,
    recipientEmails: emails,
  };
  const formValues = createScheduleFormSchema.parse(draft);

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
        <h1 className="text-2xl font-semibold tracking-tight">Editar programación</h1>
        <p className="text-muted-foreground text-sm">Modificá filtros, frecuencia o destinatarios.</p>
      </div>
      <ScheduleForm
        mode="edit"
        scheduleId={s.id}
        clients={clients.map((c) => ({ id: c.id, displayName: c.displayName }))}
        bankAccounts={accounts.map((a) => ({
          id: a.id,
          label: `${a.name} (${a.currencyCode})`,
        }))}
        defaultValues={formValues}
      />
      <div className="border-t pt-4">
        <p className="text-muted-foreground mb-2 text-sm">Zona de peligro</p>
        <DeleteScheduleButton scheduleId={s.id} />
      </div>
    </div>
  );
}
