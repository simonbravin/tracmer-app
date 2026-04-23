import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Hoy no hay selector multi-org: sin membresía con org no se puede avanzar.
 */
export function NoOrganizationMessage() {
  return (
    <Alert className="max-w-xl" variant="destructive">
      <AlertDescription>
        Necesitás pertenecer a una <strong>organización</strong> con membresía
        activa para administrar clientes. Si recién te registraste, contactá a un
        administrador o verificá el arranque en el tablero.
      </AlertDescription>
    </Alert>
  );
}
