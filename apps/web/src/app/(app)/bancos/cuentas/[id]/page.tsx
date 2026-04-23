import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { NoOrganizationMessage } from "@/components/clients/no-organization-message";
import { ArchiveBankAccountButton } from "@/components/banks/archive-bank-account-button";
import { getAppRequestContext } from "@/lib/auth/app-context";
import { getBankAccountById } from "@/lib/banks/data";
import { dateTimeAr } from "@/lib/sales/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) return { title: "Cuenta" };
  const c = await getBankAccountById(ctx.currentOrganizationId, id);
  if (!c) return { title: "Cuenta" };
  return { title: c.name };
}

export default async function CuentaBancariaDetallePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getAppRequestContext();
  if (!ctx?.currentOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Cuenta bancaria</h1>
        <NoOrganizationMessage />
        <Button variant="ghost" asChild>
          <Link href="/bancos/cuentas">Volver</Link>
        </Button>
      </div>
    );
  }
  const a = await getBankAccountById(ctx.currentOrganizationId, id);
  if (!a) notFound();
  const archived = a.deletedAt != null;
  const canEdit = !archived;
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2 h-8 text-muted-foreground">
          <Link href="/bancos/cuentas" className="text-sm">
            <ChevronLeft className="h-4 w-4" />
            Cuentas
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{a.name}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">{a.bankName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {archived ? (
                <Badge variant="secondary">Archivada</Badge>
              ) : a.isActive ? (
                <Badge variant="outline">Activa</Badge>
              ) : (
                <Badge variant="secondary">Inactiva</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={`/bancos/cuentas/${a.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
            {canEdit ? <ArchiveBankAccountButton accountId={a.id} name={a.name} /> : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Moneda de la cuenta: </span>
            {a.currencyCode}
          </p>
          <p>
            <span className="text-muted-foreground">Referencia / identificador: </span>
            <span className="font-mono">{a.accountIdentifierMasked}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Depósitos registrados: </span>
            {a._count.deposits}
            {" "}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/bancos/depositos?cuenta=${a.id}`}>Ver en listado de depósitos</Link>
            </Button>
          </p>
          <p className="text-muted-foreground">
            Creado {dateTimeAr(a.createdAt)} · Última modificación {dateTimeAr(a.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
