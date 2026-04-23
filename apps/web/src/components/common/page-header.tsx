import type { ReactNode } from "react";

import { BreadcrumbNav, type BreadcrumbItem } from "@/components/common/breadcrumb-nav";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, breadcrumbs, className, actions }: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 pb-6", className)}>
      {breadcrumbs?.length ? <BreadcrumbNav items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
