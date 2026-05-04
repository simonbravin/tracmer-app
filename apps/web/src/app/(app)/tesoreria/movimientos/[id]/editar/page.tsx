import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ManualMovementEditForm } from "@/components/treasury/manual-movement-edit-form";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";
import { getTreasuryManualMovementById, listTreasuryLocationsForManualForm } from "@/lib/treasury/data";
import { dateToYmdUtc, shortDateArUtc } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Editar movimiento manual" };

type Props = { params: Promise<{ id: string }> };

export default async function EditarMovimientoManualPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar movimiento</h1>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership.role;
  const can = await hasPermission(orgId, role.id, role.code, P.treasury_transactions.edit);
  if (!can) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar movimiento</h1>
        <p className="text-muted-foreground text-sm">No tenés permiso para editar movimientos.</p>
      </div>
    );
  }
  const m = await getTreasuryManualMovementById(orgId, id);
  if (!m || m.deletedAt) notFound();

  const locs = await listTreasuryLocationsForManualForm(orgId);
  const defaults = {
    id: m.id,
    treasuryLocationId: m.treasuryLocationId,
    movementDate: dateToYmdUtc(m.movementDate),
    amount: m.amount.toString(),
    currencyCode: m.currencyCode,
    direction: m.direction,
    memo: m.memo,
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="mb-1 -ml-2 h-8 text-muted-foreground">
          <Link href={`/tesoreria/movimientos/${m.id}`} className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Movimiento {shortDateArUtc(m.movementDate)}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar movimiento manual</h1>
        <p className="text-muted-foreground text-sm">Solo ubicaciones que no sean cuenta bancaria.</p>
      </div>
      <ManualMovementEditForm locations={locs} defaults={defaults} />
    </div>
  );
}
