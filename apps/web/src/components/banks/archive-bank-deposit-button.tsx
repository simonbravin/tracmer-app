"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

import { archiveBankDeposit, type ActionState } from "@/lib/banks/actions";
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

export function ArchiveBankDepositButton({ depositId, shortLabel }: { depositId: string; shortLabel: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onConfirm() {
    setError(null);
    start(async () => {
      const r: ActionState = await archiveBankDeposit(depositId);
      if (r.success) {
        setOpen(false);
        router.refresh();
        router.push("/bancos/depositos");
        return;
      }
      setError("error" in r ? r.error : "Error");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="text-destructive border-destructive/30">
          <Archive className="h-4 w-4" />
          Archivar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archivar depósito</DialogTitle>
          <DialogDescription>
            {shortLabel}. El registro pasa a archivado; la conciliación con cobranzas se implementa en
            otra fase.
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
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Archivando…" : "Sí, archivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
