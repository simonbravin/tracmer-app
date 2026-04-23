"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

import { archiveSale, type ActionState } from "@/lib/sales/actions";
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

type Props = {
  saleId: string;
  label: string;
};

export function ArchiveSaleButton({ saleId, label }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onConfirm() {
    setError(null);
    start(async () => {
      const r: ActionState = await archiveSale(saleId);
      if (r.success) {
        setOpen(false);
        router.push("/operaciones/ventas");
        router.refresh();
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
          <DialogTitle>Archivar venta</DialogTitle>
          <DialogDescription>
            {label} dejará de mostrarse con las facturas activas. Podés encontrarla con el
            filtro &ldquo;Archivadas&rdquo; en el listado de ventas. Cobranzas: módulo aparte.
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
