"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";

import { archiveReconciliation, type ActionState } from "@/lib/reconciliations/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Archiva (soft delete) — solo se permite vía `archiveReconciliation` al servidor para
 * `draft` o anulada; nunca reemplaza “anular” una conciliación cerrada.
 */
export function ReconciliationArchiveButton({ reconciliationId }: { reconciliationId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pend, tr] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="text-muted-foreground">
          <Archive className="h-4 w-4" />
          Archivar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archivar en sistema</DialogTitle>
          <DialogDescription>
            Oculta de la bandeja (activas) sin tocar cierres cerrados. Para un borrador, equivale a
            desechar. Conciliación cerrada: anulá primero con el botón &quot;Anular&quot; si aplica, luego
            archivá la anulada.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pend}
            onClick={() => {
              setError(null);
              tr(async () => {
                const r: ActionState = await archiveReconciliation(reconciliationId);
                if (r.success) {
                  setOpen(false);
                  router.push("/bancos/conciliaciones");
                  return;
                }
                setError("error" in r ? r.error : "Error");
              });
            }}
          >
            {pend ? "Archivando…" : "Sí, archivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
