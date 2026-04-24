/**
 * Navegación principal (es-AR). Solo estructura; sin lógica de permisos aún.
 * Futuro: filtrar ítems según matriz persistida + tenant (ver docs normativos).
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  FileText,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Scale,
  Shield,
  SlidersHorizontal,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";

export type NavLink = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  links: NavLink[];
};

export const appNavigation: NavSection[] = [
  {
    title: "Principal",
    links: [
      { title: "Tablero", href: "/tablero", icon: LayoutDashboard },
      { title: "Alertas", href: "/alertas", icon: Bell },
    ],
  },
  {
    title: "Operaciones",
    links: [
      { title: "Ventas", href: "/operaciones/ventas", icon: FileText },
      { title: "Cobranzas", href: "/operaciones/cobranzas", icon: Banknote },
    ],
  },
  {
    title: "Bancos",
    links: [
      { title: "Cuentas", href: "/bancos/cuentas", icon: Landmark },
      { title: "Depósitos", href: "/bancos/depositos", icon: PiggyBank },
      { title: "Transferencias", href: "/bancos/transferencias", icon: ArrowLeftRight },
      { title: "Conciliaciones", href: "/bancos/conciliaciones", icon: Scale },
    ],
  },
  {
    title: "Directorio",
    links: [{ title: "Clientes", href: "/clientes", icon: Users }],
  },
  {
    title: "Análisis",
    links: [
      { title: "Reportes", href: "/reportes", icon: BarChart3 },
      { title: "Reportes programados", href: "/reportes/programados", icon: CalendarClock },
    ],
  },
  {
    title: "Configuración",
    links: [
      { title: "Perfil", href: "/configuracion/perfil", icon: UserCircle },
      { title: "Equipo", href: "/configuracion/equipo", icon: UsersRound },
      { title: "Módulos y permisos", href: "/configuracion/permisos", icon: Shield },
      { title: "Reglas de alertas", href: "/configuracion/alertas", icon: SlidersHorizontal },
      { title: "Organización", href: "/configuracion/organizacion", icon: Building2 },
    ],
  },
];
