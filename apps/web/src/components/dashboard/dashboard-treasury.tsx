import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TreasuryDashboardBlock } from "@/lib/dashboard/data";
import { formatMoney } from "@/lib/sales/format";

const kindLabel: Record<string, string> = {
  bank: "Banco",
  cash: "Caja",
  electronic_wallet: "Billetera",
};

export function DashboardTreasury({ data }: { data: TreasuryDashboardBlock }) {
  const { saldos, efectivoPeriodo, operativoPeriodo } = data;
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-sm font-medium uppercase text-muted-foreground">Tesorería</h2>
          <p className="text-muted-foreground mt-1 max-w-3xl text-xs">
            Saldos por ubicación de fondos (misma lógica que el módulo de transacciones). Movimientos del período: vista
            efectivo (banco + manuales) vs operativo (cobranzas y gastos de cobranza).
          </p>
        </div>
        <Link href="/tesoreria/transacciones" className="text-primary text-sm font-medium hover:underline">
          Ver transacciones
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Saldo por ubicación</CardTitle>
            <CardDescription className="text-xs">Solo ubicaciones activas; montos en moneda de la ubicación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 text-sm">
            {saldos.length === 0 ? (
              <p className="text-muted-foreground text-xs">No hay ubicaciones cargadas.</p>
            ) : (
              saldos.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.displayName}</div>
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {kindLabel[r.kind] ?? r.kind}
                      </Badge>
                      <span>{r.currencyCode}</span>
                    </div>
                  </div>
                  <div className="tabular-nums">{formatMoney(r.balance, r.currencyCode)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos en el período</CardTitle>
            <CardDescription className="text-xs">
              Efectivo: depósitos, transferencias (monto interno y comisión en egresos), manuales. Operativo: cobranzas
              brutas y gastos de cobranza.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium uppercase">Efectivo</p>
              <div>Ingresos ARS: {formatMoney(efectivoPeriodo.ingresos.ARS, "ARS")}</div>
              <div>Ingresos USD: {formatMoney(efectivoPeriodo.ingresos.USD, "USD")}</div>
              <div>Egresos ARS: {formatMoney(efectivoPeriodo.egresos.ARS, "ARS")}</div>
              <div>Egresos USD: {formatMoney(efectivoPeriodo.egresos.USD, "USD")}</div>
              <div className="text-muted-foreground text-xs">
                Transferencias (eventos): {efectivoPeriodo.internosCount}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium uppercase">Operativo</p>
              <div>Cobrado bruto ARS: {formatMoney(operativoPeriodo.ingresos.ARS, "ARS")}</div>
              <div>Cobrado bruto USD: {formatMoney(operativoPeriodo.ingresos.USD, "USD")}</div>
              <div>Gastos cobr. ARS: {formatMoney(operativoPeriodo.egresos.ARS, "ARS")}</div>
              <div>Gastos cobr. USD: {formatMoney(operativoPeriodo.egresos.USD, "USD")}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
