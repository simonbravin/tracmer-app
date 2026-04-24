/** Tipo compartido (server + client) para la campana de alertas; sin `server-only`. */
export type AlertBellPreviewItem = {
  key: string;
  title: string;
  href: string;
  severity: string;
  sortAtIso: string;
};
