/**
 * Re-export de claves para uso en acciones / rutas (evita typos).
 * La fuente semántica sigue siendo `catalog.ts`.
 */
export const P = {
  clients: {
    view: "clients.view",
    create: "clients.create",
    edit: "clients.edit",
    archive: "clients.archive",
  },
  sales: {
    view: "sales.view",
    create: "sales.create",
    edit: "sales.edit",
  },
  collections: {
    view: "collections.view",
    create: "collections.create",
    edit: "collections.edit",
    archive: "collections.archive",
  },
  banks: {
    view: "banks.view",
    create: "banks.create",
    edit: "banks.edit",
  },
  reconciliations: {
    view: "reconciliations.view",
    create: "reconciliations.create",
    edit: "reconciliations.edit",
    archive: "reconciliations.archive",
  },
  reports: {
    view: "reports.view",
    export: "reports.export",
    send: "reports.send",
  },
  settings: {
    view: "settings.view",
    manage: "settings.manage",
  },
} as const;
