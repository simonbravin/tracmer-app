import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function DataTableSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-x-auto rounded-md border", className)} {...props} />;
}
