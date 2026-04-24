import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";
import { Resend } from "resend";

import { getPublicBaseUrl } from "@/lib/auth/public-base-url";
import { ALL_EMAIL_TYPE_CODES } from "@/lib/alert-settings/constants";
import { parseRecipientBlock } from "@/lib/alert-settings/validation";

import { labelAlertType, labelSeverity } from "./constants";
import { listAllActiveMergedAlertRows, type AlertListRow } from "./data";

const MAX_LIST = 50;

function sameUtcCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function typesFilterFromJson(j: Prisma.JsonValue | null | undefined): Set<string> | "all" {
  if (j == null) return "all";
  if (Array.isArray(j)) {
    const s = new Set(j.filter((x): x is string => typeof x === "string"));
    if (s.size === 0) return "all";
    return s;
  }
  return "all";
}

function buildAbsoluteUrl(href: string, base: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  const u = new URL(href, base);
  return u.toString();
}

function buildEmailBody(
  orgName: string,
  items: AlertListRow[],
  more: number,
  base: string,
): { text: string; html: string } {
  const list = items
    .map(
      (r) =>
        `• [${labelSeverity(r.severity)}] ${labelAlertType(r.type)}: ${r.title} — ${r.detail}\n  ${buildAbsoluteUrl(r.href, base)}`,
    )
    .join("\n");
  const tail = more > 0 ? `\n\n…y ${more} alerta(s) más. Ver el listado completo en Tracmer.` : "";
  const text = `Resumen de alertas — ${orgName}\n\n` + (list || "Sin alertas abiertas en este momento.") + tail + `\n\n${base}/alertas`;
  const li = items
    .map(
      (r) =>
        `<li><strong>${labelSeverity(r.severity)}</strong> · ${labelAlertType(r.type)}: ${escapeHtml(
          r.title,
        )} — ${escapeHtml(r.detail)}<br/><a href="${escapeAttr(buildAbsoluteUrl(r.href, base))}">Abrir</a></li>`,
    )
    .join("\n");
  const html = `<p>Resumen de alertas — <strong>${escapeHtml(orgName)}</strong></p><ul>${
    li || "<li>(Sin alertas abiertas en este momento.)</li>"
  }</ul>${
    more > 0 ? `<p>…y <strong>${more}</strong> alerta(s) más. Ver el listado completo en Tracmer.</p>` : ""
  }<p><a href="${escapeAttr(`${base}/alertas`)}">Abrir alertas</a></p>`;
  return { text, html };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export type RunAlertDigestEmailsResult = {
  sent: number;
  skipped: number;
  noAlerts: number;
  errors: number;
  details: { organizationId: string; name: string; outcome: "sent" | "skipped" | "no_alerts" | "err"; message?: string }[];
};

/**
 * Envía un resumen de alertas por email a las organizaciones que lo tienen habilitado.
 * A lo sumo **un envío por organización y por día (calendario UTC)**, mientras sigan existiendo
 * alertas que coincidan con los tipos elegidos.
 */
export async function runAlertDigestEmails(): Promise<RunAlertDigestEmailsResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const base = getPublicBaseUrl();
  const now = new Date();
  const out: RunAlertDigestEmailsResult = {
    sent: 0,
    skipped: 0,
    noAlerts: 0,
    errors: 0,
    details: [],
  };
  if (!key || !from) {
    out.details.push({
      organizationId: "_",
      name: "_",
      outcome: "err",
      message: "Falta RESEND_API_KEY o RESEND_FROM en el entorno",
    });
    out.errors = 1;
    return out;
  }

  const resend = new Resend(key);
  const settings = await prisma.organizationAlertSettings.findMany({
    where: { emailEnabled: true, emailRecipients: { not: null } },
    include: { organization: { select: { name: true } } },
  });

  for (const s of settings) {
    const orgName = s.organization?.name?.trim() || "Organización";
    const recStr = s.emailRecipients?.trim() ?? "";
    if (!recStr) {
      out.skipped++;
      out.details.push({ organizationId: s.organizationId, name: orgName, outcome: "skipped", message: "sin destinatarios" });
      continue;
    }
    const recipients = parseRecipientBlock(recStr);
    if (recipients.length === 0) {
      out.skipped++;
      out.details.push({ organizationId: s.organizationId, name: orgName, outcome: "skipped", message: "sin destinatarios" });
      continue;
    }

    if (s.lastAlertEmailDigestAt && sameUtcCalendarDay(s.lastAlertEmailDigestAt, now)) {
      out.skipped++;
      out.details.push({
        organizationId: s.organizationId,
        name: orgName,
        outcome: "skipped",
        message: "resumen ya enviado hoy (UTC)",
      });
      continue;
    }

    const allRows = await listAllActiveMergedAlertRows(s.organizationId);
    const tset = typesFilterFromJson(s.emailAlertTypes);
    const allTypes: Set<string> = new Set(ALL_EMAIL_TYPE_CODES);
    const rows = allRows.filter((r) => {
      if (tset === "all") return allTypes.has(r.type);
      return tset.has(r.type);
    });

    if (rows.length === 0) {
      out.noAlerts++;
      out.details.push({ organizationId: s.organizationId, name: orgName, outcome: "no_alerts" });
      continue;
    }

    const shown = rows.slice(0, MAX_LIST);
    const more = Math.max(0, rows.length - shown.length);
    const { text, html } = buildEmailBody(orgName, shown, more, base);
    const subject = `Alertas Tracmer · ${orgName} · ${rows.length} abierta(s)`;
    const to = recipients;

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
    if (error) {
      out.errors++;
      out.details.push({
        organizationId: s.organizationId,
        name: orgName,
        outcome: "err",
        message: error.message,
      });
      continue;
    }
    try {
      await prisma.organizationAlertSettings.update({
        where: { organizationId: s.organizationId },
        data: { lastAlertEmailDigestAt: now },
      });
    } catch (e) {
      out.errors++;
      out.details.push({
        organizationId: s.organizationId,
        name: orgName,
        outcome: "err",
        message: e instanceof Error ? e.message : "no se pudo guardar lastAlertEmailDigestAt",
      });
      continue;
    }
    out.sent++;
    out.details.push({ organizationId: s.organizationId, name: orgName, outcome: "sent" });
  }

  return out;
}
