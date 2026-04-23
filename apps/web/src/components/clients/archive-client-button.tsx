"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

import {
  archiveClient,
  type ActionState,
} from "@/lib/clients/actions";
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

export function ArchiveClientButton({ clientId, legalName }: { clientId: string; legalName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onConfirm() {
    setError(null);
    start(async () => {
      const r: ActionState = await archiveClient(clientId);
      if (r.success) {
        setOpen(false);
        router.refresh();
        router.push("/clientes");
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
          <DialogTitle>Archivar cliente</DialogTitle>
          <DialogDescription>
            {legalName} pasará a archivado y se ocultarán de la lista de activos. Los contactos
            vinculados se archiván junto con el cliente. Ventas y cobranzas: pendiente módulo.
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
