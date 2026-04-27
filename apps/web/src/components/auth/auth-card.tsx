import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Marco centrado alineado a bloques tipo Efferd auth-4 (divider + acciones sociales arriba).
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-surface transition-shadow duration-200 focus-within:shadow-raised sm:p-8",
        className,
      )}
    >
      <div className="mb-6 space-y-1 text-center sm:text-left">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
