import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Migas de pan" className="text-muted-foreground mb-2 flex flex-wrap items-center gap-1 text-xs">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden /> : null}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-foreground underline-offset-2 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
