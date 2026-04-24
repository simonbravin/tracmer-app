import "server-only";

import { prisma } from "@tracmer-app/database";

import { ALL_EMAIL_TYPE_CODES } from "./constants";

export type OrganizationAlertSettingsDTO = {
  id: string;
  emailEnabled: boolean;
  emailRecipients: string;
  /** Tipos a notificar; `null` en DB = todos los configurables. */
  emailAlertTypes: string[] | null;
};

function mapRow(r: {
  id: string;
  emailEnabled: boolean;
  emailRecipients: string | null;
  emailAlertTypes: unknown;
}): OrganizationAlertSettingsDTO {
  let types: string[] | null = null;
  if (r.emailAlertTypes != null && Array.isArray(r.emailAlertTypes)) {
    types = r.emailAlertTypes.filter((x): x is string => typeof x === "string");
  }
  return {
    id: r.id,
    emailEnabled: r.emailEnabled,
    emailRecipients: r.emailRecipients?.trim() ?? "",
    emailAlertTypes: types,
  };
}

export async function getOrganizationAlertSettings(organizationId: string): Promise<OrganizationAlertSettingsDTO> {
  const r = await prisma.organizationAlertSettings.findUnique({
    where: { organizationId },
  });
  if (!r) {
    return {
      id: "",
      emailEnabled: false,
      emailRecipients: "",
      emailAlertTypes: null,
    };
  }
  return mapRow(r);
}

export function defaultCheckedTypes(s: OrganizationAlertSettingsDTO): string[] {
  if (s.emailAlertTypes == null || s.emailAlertTypes.length === 0) {
    return [...ALL_EMAIL_TYPE_CODES];
  }
  return s.emailAlertTypes.filter((t) => ALL_EMAIL_TYPE_CODES.includes(t as (typeof ALL_EMAIL_TYPE_CODES)[number]));
}
