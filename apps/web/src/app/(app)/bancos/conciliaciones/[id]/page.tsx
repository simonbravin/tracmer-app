import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ReconciliationCloseForm } from "@/components/reconciliations/reconciliation-close-form";
import { ReconciliationLinesForm } from "@/components/reconciliations/reconciliation-lines-form";
import { ReconciliationArchiveButton } from "@/components/reconciliations/reconciliation-archive-button";
import { ReconciliationVoidButton } from "@/components/reconciliations/reconciliation-void-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { updateDraftReconciliation, type ActionState } from "@/lib/reconciliations/actions";
import { getReconciliationById, listCollectionsAndDepositsForReconForm } from "@/lib/reconciliations/data";
import { getRemanentesForEntities } from "@/lib/reconciliations/reconciliation-remainders";
import { labelDiscrepancyCategory } from "@/lib/reconciliations/discrepancy-categories";
import { labelReconciliationStatus } from "@/lib/reconciliations/reconciliation-status";
import { dateTimeAr, shortDateArUtc, formatMoney } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReconciliationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Conciliación ${id.slice(0, 8)}` };
}

export default async function ConciliacionDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Conciliación</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/conciliaciones">Volver</Link>
        </Button>
      </div>
    );
  }
  const r = await getReconciliationById(ctx.currentOrganizationId, id);
  if (!r) {
    notFound();
  }
  const archived = r.deletedAt != null;
  const isDraft = r.status === ReconciliationStatus.draft;
  const isClosed = r.status === ReconciliationStatus.closed;
  const isVoided = r.status === ReconciliationStatus.voided;

  const colIds = r.lines.map((l) => l.collectionId);
  const depIds = r.lines.map((l) => l.bankDepositId);
  const formData = isDraft
    ? await listCollectionsAndDepositsForReconForm(ctx.currentOrganizationId, colIds, depIds)
    : null;
  const remanentes =
    isClosed && !isVoided && (colIds.length > 0 || depIds.length > 0)
      ? await getRemanentesForEntities(ctx.currentOrganizationId, colIds, depIds)
      : { collections: [], deposits: [] };
  const lineOptions = r.lines.map((l) => ({
    id: l.id,
    label: `Línea #${l.id.slice(0, 8)} · ${formatMoney(l.amountAppliedToDeposit, l.bankDeposit.currencyCode)} → ${l.collection.id.slice(0, 8)}`,
  }));
  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/conciliaciones" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Conciliaciones
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Conciliación {r.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground text-sm">Estado: {labelReconciliationStatus(r.status)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {archived ? <Badge variant="secondary">Archivada</Badge> : null}
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Creada {dateTimeAr(r.createdAt)}
              {r.closedAt != null ? ` · Cerrada (marca) ${dateTimeAr(r.closedAt)}` : ""}
            </p>
            {r.notes?.trim() ? (
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">Notas: {r.notes}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {!archived && !isVoided ? <ReconciliationVoidButton reconciliationId={r.id} /> : null}
            {!archived && (isDraft || isVoided) ? <ReconciliationArchiveButton reconciliationId={r.id} /> : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Líneas de asignación</CardTitle>
        </CardHeader>
        <CardContent>
          {r.lines.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay líneas. Editá el borrador para agregar.</p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cobranza</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {shortDateArUtc(l.collection.collectionDate)} · {formatMoney(l.collection.grossAmount, l.collection.currencyCode)}
                        <p className="text-muted-foreground text-xs">ID: {l.collectionId.slice(0, 8)}</p>
                      </TableCell>
                      <TableCell>
                        {l.bankDeposit.bankAccount.name} · {shortDateArUtc(l.bankDeposit.depositDate)}
                        <p className="text-muted-foreground text-xs">ID: {l.bankDepositId.slice(0, 8)}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(l.amountAppliedToDeposit, l.collection.currencyCode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {r.discrepancies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diferencias</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {r.discrepancies.map((d) => (
                <li key={d.id} className="border-border/60 flex flex-wrap items-baseline justify-between gap-2 border-b py-1 last:border-0">
                  <span>{labelDiscrepancyCategory(d.categoryCode)}</span>
                  <span>
                    {formatMoney(d.amount, d.currencyCode)}
                    {d.notes ? ` — ${d.notes}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {isClosed && !isVoided && (remanentes.collections.some((c) => c.pending.gt(0)) || remanentes.deposits.some((d) => d.pending.gt(0))) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Remanentes (después de esta conciliación cerrada)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {remanentes.collections
              .filter((c) => c.pending.gt(0))
              .map((c) => (
                <p key={c.id}>
                  Cobranza {c.id.slice(0, 8)}: pendiente {formatMoney(c.pending, c.currencyCode)} de bruto {formatMoney(c.gross, c.currencyCode)} — <span className="text-amber-700">parcial en conciliación</span>
                </p>
              ))}
            {remanentes.deposits
              .filter((d) => d.pending.gt(0))
              .map((d) => (
                <p key={d.id}>
                  Depósito {d.id.slice(0, 8)}: pendiente {formatMoney(d.pending, d.currencyCode)} sobre monto {formatMoney(d.amount, d.currencyCode)} — <span className="text-amber-700">parcial en conciliación</span>
                </p>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {isDraft && !archived && formData ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Editar borrador</CardTitle>
          </CardHeader>
          <CardContent>
            <ReconciliationLinesForm
              mode="edit"
              formAction={
                updateDraftReconciliation.bind(
                  null,
                  r.id,
                ) as (a: ActionState | null, f: FormData) => Promise<ActionState>
              }
              collections={formData.collections}
              deposits={formData.deposits}
              defaultNotes={r.notes ?? ""}
              defaultRows={r.lines.map((l) => ({
                collectionId: l.collectionId,
                bankDepositId: l.bankDepositId,
                amount: l.amountAppliedToDeposit.toString(),
              }))}
              backHref={`/bancos/conciliaciones/${r.id}`}
            />
          </CardContent>
        </Card>
      ) : null}

      {isDraft && !archived && r.lines.length > 0 && formData ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cerrar conciliación</CardTitle>
          </CardHeader>
          <CardContent>
            <ReconciliationCloseForm reconciliationId={r.id} lineOptions={lineOptions} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
