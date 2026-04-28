"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableSurface } from "@/components/ui/data-table-surface";
import { SegmentToggleButtons } from "@/components/ui/segment-toggle-buttons";
import type { MatrixRow } from "@/lib/permissions/matrix-data";
import { toggleRoleModule, toggleRolePermission } from "@/lib/permissions/settings-actions";

type Props = { matrix: MatrixRow[] };

const ROLE_CODE_ORDER = ["owner", "admin", "operativo"] as const;

function pickInitialCode(m: MatrixRow[]) {
  for (const code of ROLE_CODE_ORDER) {
    if (m.some((r) => r.roleCode === code)) {
      return code;
    }
  }
  return m[0]?.roleCode ?? "";
}

export function PermissionMatrixEditor({ matrix }: Props) {
  const r = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>(() => pickInitialCode(matrix));

  useEffect(() => {
    if (matrix.length === 0) return;
    if (!matrix.some((row) => row.roleCode === selectedCode)) {
      setSelectedCode(pickInitialCode(matrix));
    }
  }, [matrix, selectedCode]);

  const row = matrix.find((x) => x.roleCode === selectedCode) ?? null;

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

  const roleSegments = ROLE_CODE_ORDER.flatMap((code) => {
    const m = matrix.find((x) => x.roleCode === code);
    return m ? [{ value: m.roleCode as string, label: m.roleName }] : [];
  });

  if (matrix.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay roles configurados.</p>;
  }

  if (!row) {
    return <p className="text-muted-foreground text-sm">Rol no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      {msg ? <p className="text-destructive text-sm">{msg}</p> : null}

      <div>
        <p className="text-muted-foreground mb-2 text-sm">Rol a configurar</p>
        <SegmentToggleButtons
          aria-label="Elegir rol (propietario, administrador u operativo)"
          className="max-w-2xl"
          items={roleSegments}
          value={selectedCode}
          disabled={pending}
          onValueChange={(code) => {
            setSelectedCode(code);
            setMsg(null);
          }}
        />
        <p className="text-muted-foreground mt-1.5 text-xs">
          Mostramos módulos visibles y acciones para el rol seleccionado. Cambiá de opción para ajustar otro rol.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{row.roleName}</CardTitle>
          <CardDescription>Código de rol: {row.roleCode}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-medium">Módulos visibles (habilitados para este rol)</h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {row.modules.map((m) => (
                <li key={m.moduleId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span>{m.moduleName}</span>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="accent-primary"
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
            <DataTableSurface className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/80">
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
                          className="accent-primary"
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
            </DataTableSurface>
          </div>
        </CardContent>
      </Card>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => r.refresh()}>
        Refrescar
      </Button>
    </div>
  );
}
