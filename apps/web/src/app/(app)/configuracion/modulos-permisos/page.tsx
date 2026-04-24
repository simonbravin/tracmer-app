import { redirect } from "next/navigation";

/**
 * Ruta unificada con /configuracion/permisos (mismos módulos visibles y permisos por rol).
 */
export default function ModulosPermisosPage() {
  redirect("/configuracion/permisos");
}
