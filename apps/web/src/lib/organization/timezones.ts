/** Zonas horarias admitidas en el formulario de organización (MVP). */
export const ORGANIZATION_TIMEZONE_VALUES = [
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Argentina/Mendoza",
  "America/Argentina/Salta",
  "America/Santiago",
  "America/Montevideo",
  "America/Sao_Paulo",
  "UTC",
] as const;

export type OrganizationTimezoneValue = (typeof ORGANIZATION_TIMEZONE_VALUES)[number];

export const ORGANIZATION_TIMEZONE_LABELS: Record<OrganizationTimezoneValue, string> = {
  "America/Argentina/Buenos_Aires": "Argentina — Buenos Aires",
  "America/Argentina/Cordoba": "Argentina — Córdoba",
  "America/Argentina/Mendoza": "Argentina — Mendoza",
  "America/Argentina/Salta": "Argentina — Salta",
  "America/Santiago": "Chile — Santiago",
  "America/Montevideo": "Uruguay — Montevideo",
  "America/Sao_Paulo": "Brasil — São Paulo",
  UTC: "UTC",
};
