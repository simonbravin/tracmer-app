"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@tracmer-app/database";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";
import { getAppRequestContext } from "@/lib/auth/app-context";
import {
  buildCronFromSpec,
  createScheduleFormSchema,
  type CreateScheduleForm,
  parametersOverrideSchema,
  storedReportParametersSchema,
  type UpdateScheduleForm,
  updateScheduleFormSchema,
} from "./validation";

function makeDefinitionCode() {
  return `rpt-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export type ActionState = { ok: true; id?: string } | { ok: false; error: string };

export async function createReportSchedule(form: CreateScheduleForm): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { ok: false, error: "Sin organización" };
  }
  const denied = await enforcePermission(org.ctx, P.reports.send);
  if (denied) {
    return { ok: false, error: denied };
  }
  const app = await getAppRequestContext();
  const userId = app?.appUser?.id ?? null;
  const parsed = createScheduleFormSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  const ovr = parametersOverrideSchema.parse({ schedule: d.schedule });
  const stored = storedReportParametersSchema.parse(d.parameters);
  const code = makeDefinitionCode();
  try {
    const row = await prisma.$transaction(async (tx) => {
      const def = await tx.reportDefinition.create({
        data: {
          organizationId: org.ctx.organizationId,
          code,
          name: d.name,
          reportType: d.reportType,
          defaultParameters: stored as object,
          createdByUserId: userId,
        },
      });
      const sched = await tx.reportSchedule.create({
        data: {
          organizationId: org.ctx.organizationId,
          reportDefinitionId: def.id,
          cronExpression: buildCronFromSpec(d.schedule),
          timezone: d.timezone,
          isActive: d.isActive,
          parametersOverride: ovr as object,
          createdByUserId: userId,
        },
      });
      for (const email of d.recipientEmails) {
        await tx.reportRecipient.create({
          data: { organizationId: org.ctx.organizationId, reportScheduleId: sched.id, email },
        });
      }
      return sched;
    });
    revalidatePath("/reportes/programados");
    return { ok: true, id: row.id };
  } catch (e) {
    const m = e instanceof Error ? e.message : "Error al guardar";
    return { ok: false, error: m };
  }
}

export async function updateReportSchedule(form: UpdateScheduleForm): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { ok: false, error: "Sin organización" };
  }
  const denied = await enforcePermission(org.ctx, P.reports.send);
  if (denied) {
    return { ok: false, error: denied };
  }
  const parsed = updateScheduleFormSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  const existing = await prisma.reportSchedule.findFirst({
    where: { id: d.scheduleId, organizationId: org.ctx.organizationId, deletedAt: null },
    include: { reportDefinition: true },
  });
  if (!existing?.reportDefinition) {
    return { ok: false, error: "Programación no encontrada" };
  }
  const ovr = parametersOverrideSchema.parse({ schedule: d.schedule });
  const stored = storedReportParametersSchema.parse(d.parameters);
  const defId = existing.reportDefinition.id;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.reportDefinition.update({
        where: { id: defId },
        data: { name: d.name, reportType: d.reportType, defaultParameters: stored as object },
      });
      await tx.reportSchedule.update({
        where: { id: d.scheduleId },
        data: {
          cronExpression: buildCronFromSpec(d.schedule),
          timezone: d.timezone,
          isActive: d.isActive,
          parametersOverride: ovr as object,
        },
      });
      await tx.reportRecipient.updateMany({
        where: { reportScheduleId: d.scheduleId, organizationId: org.ctx.organizationId },
        data: { deletedAt: new Date() },
      });
      for (const email of d.recipientEmails) {
        await tx.reportRecipient.create({
          data: { organizationId: org.ctx.organizationId, reportScheduleId: d.scheduleId, email },
        });
      }
    });
    revalidatePath("/reportes/programados");
    revalidatePath(`/reportes/programados/${d.scheduleId}/editar`);
    return { ok: true, id: d.scheduleId };
  } catch (e) {
    const m = e instanceof Error ? e.message : "Error al guardar";
    return { ok: false, error: m };
  }
}

export async function deleteReportSchedule(scheduleId: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { ok: false, error: "Sin organización" };
  }
  const denied = await enforcePermission(org.ctx, P.reports.send);
  if (denied) {
    return { ok: false, error: denied };
  }
  const s = await prisma.reportSchedule.findFirst({
    where: { id: scheduleId, organizationId: org.ctx.organizationId, deletedAt: null },
    include: { reportDefinition: true },
  });
  if (!s?.reportDefinition) {
    return { ok: false, error: "No encontrado" };
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.reportRecipient.updateMany({
      where: { reportScheduleId: s.id, organizationId: org.ctx.organizationId, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.reportSchedule.update({ where: { id: s.id }, data: { deletedAt: now } }),
    prisma.reportDefinition.update({ where: { id: s.reportDefinitionId }, data: { deletedAt: now } }),
  ]);
  revalidatePath("/reportes/programados");
  return { ok: true };
}
