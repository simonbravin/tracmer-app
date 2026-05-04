import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableSurface } from "@/components/ui/data-table-surface";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { P } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/server";
import { listTreasuryLocationsForOrg } from "@/lib/treasury/data";
import { treasuryBalancesByLocationId } from "@/lib/treasury/balances";
import { Prisma } from "@prisma/client";

import { formatMoney } from "@/lib/sales/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ubicaciones de fondos",
  description: "Banco, caja y billeteras",
};

const kindLabel: Record<string, string> = {
  bank: "Banco",
  cash: "Caja",
  electronic_wallet: "Billetera",
};

export default async function UbicacionesPage() {
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId || !ctx.primaryMembership) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Ubicaciones de fondos</h1>
        <p className="text-muted-foreground text-sm">Dónde está el dinero de la empresa.</p>
        <NoOrganizationMessage />
      </div>
    );
  }
  const orgId = ctx.currentOrganizationId;
  const role = ctx.primaryMembership.role;
  const canView = await hasPermission(orgId, role.id, role.code, P.treasury_locations.view);
  if (!canView) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Ubicaciones de fondos</h1>
        <p className="text-muted-foreground text-sm">No tenés permiso para ver ubicaciones de tesorería.</p>
      </div>
    );
  }
  const [locs, bals] = await Promise.all([listTreasuryLocationsForOrg(orgId), treasuryBalancesByLocationId(orgId)]);
  const canCreate = await hasPermission(orgId, role.id, role.code, P.treasury_locations.create);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ubicaciones de fondos</h1>
          <p className="text-muted-foreground text-sm">
            Cada cuenta bancaria tiene una ubicación tipo Banco. Podés sumar caja chica o Mercado Pago como ubicaciones
            propias.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/tesoreria/ubicaciones/nueva" className="inline-flex">
              <Plus className="h-4 w-4" />
              Nueva ubicación
            </Link>
          </Button>
        ) : null}
      </div>

      <DataTableSurface>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-24 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {locs.map((l) => {
              const bal = bals.get(l.id);
              const archived = l.bankAccount?.deletedAt != null || !l.isActive;
              return (
                <TableRow key={l.id} className={archived ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    <div>{l.displayName}</div>
                    {l.providerCode ? (
                      <div className="text-muted-foreground text-xs">{l.providerCode}</div>
                    ) : null}
                    {l.bankAccount ? (
                      <div className="text-muted-foreground text-xs">
                        {l.bankAccount.bankName} · {l.bankAccount.name}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{kindLabel[l.kind] ?? l.kind}</Badge>
                  </TableCell>
                  <TableCell>{l.currencyCode}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatMoney(bal ?? new Prisma.Decimal(0), l.currencyCode)}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.bankAccount?.id ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/bancos/cuentas/${l.bankAccount.id}`}>Cuenta</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/tesoreria/transacciones?ubicacion=${l.id}`}>Mov.</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableSurface>
    </div>
  );
}
