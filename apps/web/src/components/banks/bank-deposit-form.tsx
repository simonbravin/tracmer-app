"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Prisma } from "@prisma/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoneyPlain } from "@/lib/sales/format";
import type { ActionState } from "@/lib/banks/actions";

type FormDepositAction = (state: ActionState | null, data: FormData) => Promise<ActionState>;

type Acc = { id: string; name: string; bankName: string; currencyCode: "ARS" | "USD" };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {children}
    </Button>
  );
}

function arsHint(amountStr: string, ccy: "ARS" | "USD", fxStr: string) {
  const raw = String(amountStr ?? "").replace(/\s/g, "").replace(",", ".");
  const n = Number(raw);
  if (ccy === "ARS" || !Number.isFinite(n) || n <= 0) {
    return null;
  }
  const a = new Prisma.Decimal(String(n));
  const t = String(fxStr).replace(/\s/g, "").replace(",", ".").trim();
  if (t === "") {
    return null;
  }
  const f = new Prisma.Decimal(t);
  if (f.lte(0)) {
    return null;
  }
  return a.mul(f);
}

function DepositFormFields({
  accounts,
  defaultBankAccountId,
  defaultDepositDate,
  ccy,
  onCcy,
  amount,
  onAmount,
  fx,
  onFx,
  defaultReference,
}: {
  accounts: Acc[];
  defaultBankAccountId: string;
  defaultDepositDate: string;
  ccy: "ARS" | "USD";
  onCcy: (v: "ARS" | "USD") => void;
  amount: string;
  onAmount: (v: string) => void;
  fx: string;
  onFx: (v: string) => void;
  defaultReference: string;
}) {
  const hint = useMemo(() => arsHint(amount, ccy, fx), [amount, ccy, fx]);
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="bankAccountId">Cuenta bancaria</Label>
        <select
          id="bankAccountId"
          name="bankAccountId"
          defaultValue={defaultBankAccountId || ""}
          required
          className="border-input bg-background h-9 w-full max-w-md rounded-md border px-2 text-sm shadow-sm"
        >
          <option value="" disabled>
            {accounts.length ? "Elegí una cuenta" : "No hay cuentas activas"}
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.bankName} ({a.currencyCode})
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Cuenta operativa. La moneda del depósito se indica aparte; el monto y la tasa definen el equivalente ARS.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="depositDate">Fecha de depósito</Label>
        <Input
          id="depositDate"
          name="depositDate"
          type="date"
          required
          defaultValue={defaultDepositDate}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currencyCode">Moneda del depósito</Label>
        <select
          id="currencyCode"
          name="currencyCode"
          value={ccy}
          onChange={(e) => onCcy(e.target.value as "ARS" | "USD")}
          className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-2 text-sm shadow-sm"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
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
      {ccy === "USD" ? (
        <div className="grid gap-2">
          <Label htmlFor="fxRateArsPerUnitUsdAtDeposit">Tasa ARS por 1 USD</Label>
          <Input
            id="fxRateArsPerUnitUsdAtDeposit"
            name="fxRateArsPerUnitUsdAtDeposit"
            value={fx}
            onChange={(e) => onFx(e.target.value)}
            inputMode="decimal"
            placeholder="p. ej. 1200"
            required
          />
        </div>
      ) : (
        <input type="hidden" name="fxRateArsPerUnitUsdAtDeposit" value="" />
      )}
      {ccy === "USD" && hint != null ? (
        <p className="text-muted-foreground text-sm">
          Equiv. aprox. ARS: {formatMoneyPlain(hint)} (según tasa y monto)
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="reference">Referencia (opcional)</Label>
        <Input id="reference" name="reference" defaultValue={defaultReference} maxLength={120} />
      </div>
    </>
  );
}

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

export function BankDepositFormCreate({
  formAction,
  accounts,
  defaultDepositDate,
}: {
  formAction: FormDepositAction;
  accounts: Acc[];
  defaultDepositDate: string;
}) {
  const [state, action] = useFormState(formAction, null);
  const [ccy, setCcy] = useState<"ARS" | "USD">("ARS");
  const [amount, setAmount] = useState("");
  const [fx, setFx] = useState("");
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <AlertBlock state={state} />
      <DepositFormFields
        accounts={accounts}
        defaultBankAccountId=""
        defaultDepositDate={defaultDepositDate}
        ccy={ccy}
        onCcy={setCcy}
        amount={amount}
        onAmount={setAmount}
        fx={fx}
        onFx={setFx}
        defaultReference=""
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>Registrar depósito</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/bancos/depositos">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

export function BankDepositFormEdit({
  formAction,
  accounts,
  backHref,
  defaultValues,
}: {
  formAction: FormDepositAction;
  accounts: Acc[];
  backHref: string;
  defaultValues: {
    bankAccountId: string;
    depositDate: string;
    amount: string;
    currencyCode: "ARS" | "USD";
    reference: string;
    fxRateArsPerUnitUsdAtDeposit: string;
  };
}) {
  const [state, action] = useFormState(formAction, null);
  const [ccy, setCcy] = useState<"ARS" | "USD">(defaultValues.currencyCode);
  const [amount, setAmount] = useState(defaultValues.amount);
  const [fx, setFx] = useState(defaultValues.fxRateArsPerUnitUsdAtDeposit);
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <AlertBlock state={state} />
      <DepositFormFields
        accounts={accounts}
        defaultBankAccountId={defaultValues.bankAccountId}
        defaultDepositDate={defaultValues.depositDate}
        ccy={ccy}
        onCcy={setCcy}
        amount={amount}
        onAmount={setAmount}
        fx={fx}
        onFx={setFx}
        defaultReference={defaultValues.reference}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>Guardar cambios</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
