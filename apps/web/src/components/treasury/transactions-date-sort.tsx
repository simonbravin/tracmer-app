"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Toggle orden por fecha conservando el resto de query params. */
export function TransactionsDateSortToggle({ currentOrden }: { currentOrden: "asc" | "desc" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = currentOrden === "desc" ? "asc" : "desc";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 font-normal"
      onClick={() => {
        const s = new URLSearchParams(sp.toString());
        if (next === "desc") {
          s.delete("orden");
        } else {
          s.set("orden", next);
        }
        s.set("page", "1");
        router.push(`/tesoreria/transacciones?${s.toString()}`);
      }}
      title={currentOrden === "desc" ? "Ordenar: más antiguos primero" : "Ordenar: más recientes primero"}
    >
      Fecha
      {currentOrden === "desc" ? (
        <ArrowDownWideNarrow className="text-muted-foreground h-4 w-4" aria-hidden />
      ) : (
        <ArrowUpWideNarrow className="text-muted-foreground h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}
