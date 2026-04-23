import type { SaleStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { labelSaleStatus } from "@/lib/sales/status";

function variantForStatus(s: SaleStatus): "muted" | "info" | "warning" | "success" | "destructive" | "outline" {
  switch (s) {
    case "draft":
      return "muted";
    case "issued":
      return "info";
    case "partially_collected":
      return "warning";
    case "collected":
      return "success";
    case "overdue":
      return "destructive";
    case "cancelled":
      return "outline";
  }
}

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return (
    <Badge variant={variantForStatus(status)} className="max-sm:text-xs font-normal">
      {labelSaleStatus(status)}
    </Badge>
  );
}
