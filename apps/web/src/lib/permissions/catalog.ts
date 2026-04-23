/**
 * Catálogo de módulos y acciones (BR §12). Las claves de permiso son `moduleCode.actionCode`.
 * No usar strings sueltos fuera de este archivo + `keys.ts`.
 */
export const APP_MODULES = [
  { code: "clients", displayName: "Clientes" },
  { code: "sales", displayName: "Ventas" },
  { code: "collections", displayName: "Cobranzas" },
  { code: "banks", displayName: "Bancos" },
  { code: "reconciliations", displayName: "Conciliaciones" },
  { code: "reports", displayName: "Reportes" },
  { code: "settings", displayName: "Configuración" },
] as const;

export type AppModuleCode = (typeof APP_MODULES)[number]["code"];

/** Acciones por módulo (alineado a `PermissionDefinition.action_code` en DB). */
export const MODULE_ACTIONS: Record<AppModuleCode, readonly string[]> = {
  clients: ["view", "create", "edit", "archive"],
  sales: ["view", "create", "edit"],
  collections: ["view", "create", "edit", "archive"],
  banks: ["view", "create", "edit"],
  reconciliations: ["view", "create", "edit", "archive"],
  reports: ["view", "export", "send"],
  settings: ["view", "manage"],
};

export function parsePermissionKey(key: string): { moduleCode: AppModuleCode; actionCode: string } | null {
  const i = key.indexOf(".");
  if (i <= 0) return null;
  const moduleCode = key.slice(0, i) as AppModuleCode;
  const actionCode = key.slice(i + 1);
  const actions = MODULE_ACTIONS[moduleCode];
  if (!actions || !(actions as readonly string[]).includes(actionCode)) {
    return null;
  }
  return { moduleCode, actionCode };
}

export function allPermissionKeys(): string[] {
  const keys: string[] = [];
  for (const m of APP_MODULES) {
    for (const a of MODULE_ACTIONS[m.code]) {
      keys.push(`${m.code}.${a}`);
    }
  }
  return keys;
}
