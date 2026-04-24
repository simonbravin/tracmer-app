"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SegmentToggleItem<K extends string = string> = {
  value: K;
  label: string;
};

type SegmentToggleButtonsProps<K extends string> = {
  items: SegmentToggleItem<K>[];
  value: K;
  onValueChange: (value: K) => void;
  disabled?: boolean;
  /** p. ej. `aria-label` del grupo */
  "aria-label"?: string;
  className?: string;
};

/**
 * Grupo de opciones mutuamente excluyentes con la misma estética que los accesos rápidos del tablero
 * (Este mes / Este año / Personalizado): `Button` `default` vs `secondary`, `size="sm"`.
 */
export function SegmentToggleButtons<K extends string>({
  items,
  value,
  onValueChange,
  disabled,
  "aria-label": ariaLabel,
  className,
}: SegmentToggleButtonsProps<K>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <Button
          key={String(item.value)}
          type="button"
          variant={value === item.value ? "default" : "secondary"}
          size="sm"
          disabled={disabled}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
