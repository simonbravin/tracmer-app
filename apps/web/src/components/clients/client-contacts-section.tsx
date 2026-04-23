"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  archiveClientContact,
  createClientContact,
  updateClientContact,
  type ActionState,
} from "@/lib/clients/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleLabel: string | null;
};

function FormSubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending}>{children}</Button>;
}

function NewContactForm({
  clientId,
  onSuccess,
}: {
  clientId: string;
  onSuccess: () => void;
}) {
  const [state, action] = useFormState(
    createClientContact.bind(
      null,
      clientId,
    ) as (a: ActionState | null, f: FormData) => Promise<ActionState>,
    null,
  );
  const ok = state?.success;
  useEffect(() => {
    if (ok) onSuccess();
  }, [ok, onSuccess]);
  return (
    <form action={action} className="space-y-3">
      {state?.success === false ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="nc-name">Nombre</Label>
        <Input id="nc-name" name="name" required maxLength={300} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nc-email">Email</Label>
        <Input id="nc-email" name="email" type="email" maxLength={500} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nc-phone">Teléfono</Label>
        <Input id="nc-phone" name="phone" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nc-role">Rol o cargo (opcional)</Label>
        <Input id="nc-role" name="roleLabel" maxLength={200} />
      </div>
      <div className="flex justify-end">
        <FormSubmitButton>Agregar</FormSubmitButton>
      </div>
    </form>
  );
}

function EditContactForm({
  clientId,
  contact,
  onSuccess,
}: {
  clientId: string;
  contact: Contact;
  onSuccess: () => void;
}) {
  const [state, action] = useFormState(
    updateClientContact.bind(
      null,
      clientId,
      contact.id,
    ) as (a: ActionState | null, f: FormData) => Promise<ActionState>,
    null,
  );
  const ok = state?.success;
  useEffect(() => {
    if (ok) onSuccess();
  }, [ok, onSuccess]);
  return (
    <form action={action} className="space-y-3">
      {state?.success === false ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="e-name">Nombre</Label>
        <Input
          id="e-name"
          name="name"
          required
          defaultValue={contact.name}
          maxLength={300}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="e-email">Email</Label>
        <Input
          id="e-email"
          name="email"
          type="email"
          defaultValue={contact.email ?? ""}
          maxLength={500}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="e-phone">Teléfono</Label>
        <Input
          id="e-phone"
          name="phone"
          defaultValue={contact.phone ?? ""}
          maxLength={100}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="e-role">Rol o cargo (opcional)</Label>
        <Input
          id="e-role"
          name="roleLabel"
          defaultValue={contact.roleLabel ?? ""}
          maxLength={200}
        />
      </div>
      <div className="flex justify-end">
        <FormSubmitButton>Guardar</FormSubmitButton>
      </div>
    </form>
  );
}

function ArchiveContactButton({
  clientId,
  contact,
}: { clientId: string; contact: Contact }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Archivar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archivar contacto</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          &ldquo;{contact.name}&rdquo; se archivó y dejará de listarse. Podrás
          añadir otro contacto nuevo cuando corresponda.
        </p>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              start(async () => {
                const r = await archiveClientContact(clientId, contact.id);
                if (r.success) {
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            {pending ? "Archivando…" : "Archivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientContactsSection({
  clientId,
  canEdit,
  contacts: initial,
}: { clientId: string; canEdit: boolean; contacts: Contact[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newFormKey, setNewFormKey] = useState(0);
  const [edit, setEdit] = useState<Contact | null>(null);
  const router = useRouter();
  const onAddDone = useCallback(() => {
    setAddOpen(false);
    router.refresh();
  }, [router]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contactos</CardTitle>
        {canEdit ? (
          <Dialog
            open={addOpen}
            onOpenChange={(o) => {
              if (o) setNewFormKey((k) => k + 1);
              setAddOpen(o);
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Nuevo contacto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo contacto</DialogTitle>
              </DialogHeader>
              <NewContactForm
                key={newFormKey}
                clientId={clientId}
                onSuccess={onAddDone}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </CardHeader>
      <CardContent>
        {initial.length === 0 && !addOpen ? (
          <p className="text-muted-foreground text-sm">No hay contactos cargados.</p>
        ) : null}
        <ul className="space-y-2">
          {initial.map((c) => (
            <li key={c.id}>
              <div className="bg-muted/30 flex flex-col justify-between gap-2 rounded-md p-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{c.name}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {[c.roleLabel, c.email, c.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ArchiveContactButton clientId={clientId} contact={c} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {edit && canEdit ? (
          <Dialog
            open
            onOpenChange={(o) => {
              if (!o) setEdit(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar contacto</DialogTitle>
              </DialogHeader>
              <EditContactForm
                key={edit.id}
                clientId={clientId}
                contact={edit}
                onSuccess={() => {
                  setEdit(null);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </CardContent>
    </Card>
  );
}
