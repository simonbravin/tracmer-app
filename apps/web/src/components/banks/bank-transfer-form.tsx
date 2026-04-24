"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/banks/actions";

type FormTransferAction = (state: ActionState | null, data: FormData) => Promise<ActionState>;

export type TransferFormAccount = {
  id: string;
  name: string;
  bankName: string;
  currencyCode: "ARS" | "USD";
  isActive?: boolean;
};

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {children}
    </Button>
  );
}

const selClass =
  "border-input bg-background h-9 w-full max-w-md rounded-md border px-2 text-sm shadow-sm";

function AlertBlock({ state }: { state: ActionState | null }) {
  return (
    <>
      {state?.success === false ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.error}
            {state.fieldErrors ? (
              <ul className="mt-2 list-inside list-disc text-sm">
                {Object.entries(state.fieldErrors).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert>
          <AlertDescription>{(state as { message?: string }).message}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function TransferFields({
  accounts,
  fromId,
  onFromId,
  toId,
  onToId,
  defaultTransferDate,
  amount,
  onAmount,
  defaultFee,
  defaultNotes,
}: {
  accounts: TransferFormAccount[];
  fromId: string;
  onFromId: (id: string) => void;
  toId: string;
  onToId: (id: string) => void;
  defaultTransferDate: string;
  amount: string;
  onAmount: (v: string) => void;
  defaultFee: string;
  defaultNotes: string;
}) {
  const fromAcc = useMemo(() => accounts.find((a) => a.id === fromId), [accounts, fromId]);
  const toOptions = useMemo(() => {
    if (!fromAcc) return [];
    return accounts.filter((a) => a.id !== fromAcc.id && a.currencyCode === fromAcc.currencyCode);
  }, [accounts, fromAcc]);

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="fromBankAccountId">Cuenta origen</Label>
        <select
          id="fromBankAccountId"
          name="fromBankAccountId"
          className={selClass}
          value={fromId}
          required
          onChange={(e) => onFromId(e.target.value)}
        >
          <option value="" disabled>
            {accounts.length ? "Elegí origen" : "No hay cuentas"}
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.bankName} ({a.currencyCode})
              {a.isActive === false ? " — inactiva" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="toBankAccountId">Cuenta destino</Label>
        <select
          id="toBankAccountId"
          name="toBankAccountId"
          className={selClass}
          value={toId}
          required
          disabled={!fromAcc || toOptions.length === 0}
          onChange={(e) => onToId(e.target.value)}
        >
          <option value="" disabled>
            {!fromAcc
              ? "Elegí primero el origen"
              : toOptions.length === 0
                ? "Sin otra cuenta en la misma moneda"
                : "Elegí destino"}
          </option>
          {toOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.bankName} ({a.currencyCode})
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Solo se listan cuentas activas con la misma moneda que el origen. Las transferencias no imputan cobranzas ni
          ventas.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="transferDate">Fecha de transferencia</Label>
        <Input id="transferDate" name="transferDate" type="date" required defaultValue={defaultTransferDate} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          name="amount"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          inputMode="decimal"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="feeAmount">Comisión / costo del banco (opcional)</Label>
        <Input
          id="feeAmount"
          name="feeAmount"
          defaultValue={defaultFee}
          inputMode="decimal"
          placeholder="0"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Input id="notes" name="notes" defaultValue={defaultNotes} maxLength={2000} />
      </div>
    </>
  );
}

export function BankTransferFormCreate({
  formAction,
  accounts,
  defaultTransferDate,
}: {
  formAction: FormTransferAction;
  accounts: TransferFormAccount[];
  defaultTransferDate: string;
}) {
  const [state, action] = useFormState(formAction, null);
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toOptions = fromAcc
    ? accounts.filter((a) => a.id !== fromAcc.id && a.currencyCode === fromAcc.currencyCode)
    : [];

  useEffect(() => {
    const from = accounts.find((a) => a.id === fromId);
    if (!from) return;
    const valid = accounts.filter((a) => a.id !== from.id && a.currencyCode === from.currencyCode);
    setToId((prev) => (valid.some((v) => v.id === prev) ? prev : valid[0]?.id ?? ""));
  }, [fromId, accounts]);

  return (
    <form action={action} className="max-w-2xl space-y-4">
      <AlertBlock state={state} />
      <TransferFields
        accounts={accounts}
        fromId={fromId}
        onFromId={setFromId}
        toId={toId}
        onToId={setToId}
        defaultTransferDate={defaultTransferDate}
        amount={amount}
        onAmount={setAmount}
        defaultFee=""
        defaultNotes=""
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton disabled={!fromId || !toId || toOptions.length === 0}>Registrar transferencia</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/bancos/transferencias">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

export function BankTransferFormEdit({
  formAction,
  accounts,
  backHref,
  defaultValues,
}: {
  formAction: FormTransferAction;
  accounts: TransferFormAccount[];
  backHref: string;
  defaultValues: {
    fromBankAccountId: string;
    toBankAccountId: string;
    transferDate: string;
    amount: string;
    feeAmount: string;
    notes: string;
  };
}) {
  const [state, action] = useFormState(formAction, null);
  const [fromId, setFromId] = useState(defaultValues.fromBankAccountId);
  const [toId, setToId] = useState(defaultValues.toBankAccountId);
  const [amount, setAmount] = useState(defaultValues.amount);

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toOptions = fromAcc
    ? accounts.filter((a) => a.id !== fromAcc.id && a.currencyCode === fromAcc.currencyCode)
    : [];

  useEffect(() => {
    const from = accounts.find((a) => a.id === fromId);
    if (!from) return;
    const valid = accounts.filter((a) => a.id !== from.id && a.currencyCode === from.currencyCode);
    setToId((prev) => (valid.some((v) => v.id === prev) ? prev : valid[0]?.id ?? ""));
  }, [fromId, accounts]);

  return (
    <form action={action} className="max-w-2xl space-y-4">
      <AlertBlock state={state} />
      <TransferFields
        accounts={accounts}
        fromId={fromId}
        onFromId={setFromId}
        toId={toId}
        onToId={setToId}
        defaultTransferDate={defaultValues.transferDate}
        amount={amount}
        onAmount={setAmount}
        defaultFee={defaultValues.feeAmount}
        defaultNotes={defaultValues.notes}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton disabled={!fromId || !toId || toOptions.length === 0}>Guardar cambios</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
