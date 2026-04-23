"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

import { voidReconciliation, type ActionState } from "@/lib/reconciliations/actions";
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

export function ReconciliationVoidButton({ reconciliationId }: { reconciliationId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pend, tr] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="text-amber-700 border-amber-200 dark:text-amber-200">
          <Ban className="h-4 w-4" />
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular conciliación</DialogTitle>
          <DialogDescription>
            Las asignaciones deján de afectar saldos conciliables (cobranzas/depósitos) para cobranza y
            bancos. Queda registro. Si estaba en borrador, se puede archivar luego. Si estaba cerrada, podés
            rearmar otra conciliación.
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
            onClick={() => {
              setError(null);
              tr(async () => {
                const r: ActionState = await voidReconciliation(reconciliationId);
                if (r.success) {
                  setOpen(false);
                  router.refresh();
                  return;
                }
                setError("error" in r ? r.error : "Error");
              });
            }}
            disabled={pend}
            variant="default"
          >
            {pend ? "Anulando…" : "Confirmar anulación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
