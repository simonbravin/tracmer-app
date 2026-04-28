import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/sales/format";

import type { DashboardKpis } from "@/lib/dashboard/data";

const items: { key: keyof DashboardKpis; label: string; help?: string }[] = [
  { key: "facturado", label: "Total facturado" },
  { key: "cobradoBruto", label: "Cobrado bruto" },
  { key: "cobradoNeto", label: "Cobrado neto" },
  { key: "depositado", label: "Total depositado" },
  { key: "pendienteCobrar", label: "Pendiente por cobrar" },
  {
    key: "pendienteDepositar",
    label: "Pendiente por depositar (concil.)",
    help: "Saldo de cobranza aún no aplicado a un depósito bajo el modelo actual de conciliación.",
  },
];

export function DashboardKpis({ data }: { data: DashboardKpis }) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ key, label, help }) => {
          const b = data[key];
          return (
            <Card key={key} className="ui-interactive-lift min-w-0">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium leading-tight">
                  {label}
                  {help && (
                    <span className="text-muted-foreground block text-xs font-normal" title={help}>
                      (ver leyenda abajo)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-4 pt-0 text-sm">
                <div>ARS: {formatMoney(b.ARS, "ARS")}</div>
                <div>USD: {formatMoney(b.USD, "USD")}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-2 max-w-3xl text-xs">
        Importes en moneda original, sin mezclar monedas. Criterios: facturado por fecha de emisión; cobranza bruta
        (importe cobrado) y neta (bruta menos gastos en moneda de cobranza) por fecha de cobranza; depósitos por fecha
        de depósito; CxC sobre ventas abiertas en el rango y pendiente a conciliar a depósito como en bancos.
        Con un cliente seleccionado, el facturado y CxC respetan al cliente; cobranza, depósito y &quot;pend. depositar&quot;
        siguen a nivel de organización.
      </p>
    </div>
  );
}
