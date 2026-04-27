import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function DataTableSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-card border-border overflow-x-auto rounded-md border shadow-surface transition-shadow duration-200 focus-within:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}
