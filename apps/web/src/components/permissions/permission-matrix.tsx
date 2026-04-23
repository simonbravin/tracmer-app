"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatrixRow } from "@/lib/permissions/matrix-data";
import { toggleRoleModule, toggleRolePermission } from "@/lib/permissions/settings-actions";

type Props = { matrix: MatrixRow[] };

export function PermissionMatrixEditor({ matrix }: Props) {
  const r = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setMsg(res.error ?? "Error");
        return;
      }
      r.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {msg ? <p className="text-destructive text-sm">{msg}</p> : null}
      {matrix.map((row) => (
        <Card key={row.roleId}>
          <CardHeader>
            <CardTitle className="text-base">{row.roleName}</CardTitle>
            <CardDescription>Código de rol: {row.roleCode}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">Módulos habilitados</h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {row.modules.map((m) => (
                  <li key={m.moduleId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span>{m.moduleName}</span>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={m.isEnabled}
                        disabled={pending}
                        onChange={(e) =>
                          run(() =>
                            toggleRoleModule({
                              roleId: row.roleId,
                              moduleId: m.moduleId,
                              isEnabled: e.target.checked,
                            }),
                          )
                        }
                      />
                      <span className="text-muted-foreground text-xs">Activo</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Permisos por acción</h3>
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="p-2">Módulo</th>
                      <th className="p-2">Acción</th>
                      <th className="p-2 w-24">Permitido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.permissions.map((p) => (
                      <tr key={p.permissionDefinitionId} className="border-t">
                        <td className="p-2">{p.moduleCode}</td>
                        <td className="p-2 font-mono text-xs">{p.actionCode}</td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={p.isAllowed}
                            disabled={pending}
                            onChange={(e) =>
                              run(() =>
                                toggleRolePermission({
                                  roleId: row.roleId,
                                  permissionDefinitionId: p.permissionDefinitionId,
                                  isAllowed: e.target.checked,
                                }),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => r.refresh()}>
        Refrescar
      </Button>
    </div>
  );
}
