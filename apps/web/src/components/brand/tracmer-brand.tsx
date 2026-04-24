import { Truck } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Muestra “Tracmer” al lado; el sidebar a veces solo usa el icono. */
  showWordmark?: boolean;
  size?: "default" | "lg";
};

export function TracmerBrand({ className, showWordmark = true, size = "default" }: Props) {
  const dim = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  return (
    <div className={cn("inline-flex items-center justify-center gap-2.5", className)} data-brand="tracmer">
      <Truck className={cn(dim, "shrink-0 text-primary")} aria-hidden />
      {showWordmark ? (
        <span className="text-xl font-semibold tracking-tight sm:text-2xl">Tracmer</span>
      ) : null}
    </div>
  );
}
