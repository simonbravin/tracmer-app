import { ALL_EMAIL_TYPE_CODES } from "./constants";

export type OrganizationAlertSettingsDTO = {
  id: string;
  emailEnabled: boolean;
  emailRecipients: string;
  /** Tipos a notificar; `null` en DB = todos los configurables. */
  emailAlertTypes: string[] | null;
};

export function defaultCheckedTypes(s: OrganizationAlertSettingsDTO): string[] {
  if (s.emailAlertTypes == null || s.emailAlertTypes.length === 0) {
    return [...ALL_EMAIL_TYPE_CODES];
  }
  return s.emailAlertTypes.filter((t) => ALL_EMAIL_TYPE_CODES.includes(t as (typeof ALL_EMAIL_TYPE_CODES)[number]));
}
