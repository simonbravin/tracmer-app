import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ArchiveTreasuryManualButton } from "@/components/treasury/archive-treasury-manual-button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";
import { getTreasuryManualMovementById } from "@/lib/treasury/data";
import { formatMoney, shortDateArUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) return { title: "Movimiento manual" };
  const m = await getTreasuryManualMovementById(ctx.currentOrganizationId, id);
  if (!m) return { title: "Movimiento manual" };
  return { title: `Manual ${shortDateArUtc(m.movementDate)}` };
}

export default async function MovimientoManualDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Movimiento manual</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership.role;
  const canView = await hasPermission(orgId, role.id, role.code, P.treasury_transactions.view);
  if (!canView) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Movimiento manual</h1>
        <p className="text-muted-foreground text-sm">No tenés permiso para ver este movimiento.</p>
      </div>
    );
  }
  const m = await getTreasuryManualMovementById(orgId, id);
  if (!m) notFound();
  const archived = m.deletedAt != null;
  const canEdit = !archived && (await hasPermission(orgId, role.id, role.code, P.treasury_transactions.edit));
  const canArchive = !archived && (await hasPermission(orgId, role.id, role.code, P.treasury_transactions.archive));
  const dirLabel = m.direction === "inflow" ? "Ingreso" : "Egreso";
  const label = `${dirLabel} · ${shortDateArUtc(m.movementDate)} · ${formatMoney(m.amount, m.currencyCode)}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
          <Link href="/tesoreria/transacciones" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Transacciones
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{formatMoney(m.amount, m.currencyCode)}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {dirLabel} · {shortDateArUtc(m.movementDate)} · {m.treasuryLocation.displayName}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {archived ? <Badge variant="secondary">Archivado</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={`/tesoreria/movimientos/${m.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
            {canArchive ? <ArchiveTreasuryManualButton movementId={m.id} shortLabel={label} /> : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Ubicación: </span>
            {m.treasuryLocation.displayName} ({m.treasuryLocation.currencyCode})
          </p>
          <p>
            <span className="text-muted-foreground">Moneda: </span>
            {m.currencyCode}
          </p>
          <p>
            <span className="text-muted-foreground">Monto: </span>
            {formatMoney(m.amount, m.currencyCode)}
          </p>
          {m.memo ? (
            <p>
              <span className="text-muted-foreground">Nota: </span>
              {m.memo}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
