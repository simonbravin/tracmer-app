/**
 * Navegación principal (es-AR). Solo estructura; sin lógica de permisos aún.
 * Futuro: filtrar ítems según matriz persistida + tenant (ver docs normativos).
 */
export type NavLink = {
  title: string;
  href: string;
};

export type NavSection = {
  title: string;
  links: NavLink[];
};

export const appNavigation: NavSection[] = [
  {
    title: "Principal",
    links: [
      { title: "Tablero", href: "/tablero" },
      { title: "Alertas", href: "/alertas" },
    ],
  },
  {
    title: "Operaciones",
    links: [
      { title: "Ventas", href: "/operaciones/ventas" },
      { title: "Cobranzas", href: "/operaciones/cobranzas" },
    ],
  },
  {
    title: "Bancos",
    links: [
      { title: "Cuentas", href: "/bancos/cuentas" },
      { title: "Depósitos", href: "/bancos/depositos" },
      { title: "Transferencias", href: "/bancos/transferencias" },
      { title: "Conciliaciones", href: "/bancos/conciliaciones" },
    ],
  },
  {
    title: "Directorio",
    links: [{ title: "Clientes", href: "/clientes" }],
  },
  {
    title: "Análisis",
    links: [
      { title: "Reportes", href: "/reportes" },
      { title: "Reportes programados", href: "/reportes/programados" },
    ],
  },
  {
    title: "Configuración",
    links: [
      { title: "Perfil", href: "/configuracion/perfil" },
      { title: "Equipo", href: "/configuracion/equipo" },
      { title: "Permisos por rol", href: "/configuracion/permisos" },
      { title: "Módulos y permisos", href: "/configuracion/modulos-permisos" },
      { title: "Reglas de alertas (futuro)", href: "/configuracion/alertas" },
      { title: "Organización", href: "/configuracion/organizacion" },
    ],
  },
];
