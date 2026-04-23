"use server";

import { revalidatePath } from "next/cache";

import { AlertStatus, Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

import { requireOrganizationContext } from "@/lib/clients/require-organization";
import { formDataToObject } from "@/lib/clients/validation";

import { resolveAlertSnapshot } from "./data";
import { alertActionFormSchema } from "./validation";

function keyOf(type: string, entityType: string, entityId: string) {
  return `${type}::${entityType}::${entityId}`;
}

export async function updateAlertStatusAction(formData: FormData) {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return;
  }
  const orgId = org.ctx.organizationId;
  const raw = formDataToObject(formData);
  const parsed = alertActionFormSchema.safeParse(raw);
  if (!parsed.success) {
    return;
  }
  const { type, entityType, entityId, action } = parsed.data;

  const snap = await resolveAlertSnapshot(orgId, type, entityType, entityId);
  if (!snap) {
    return;
  }

  const existing = await prisma.alert.findFirst({
    where: { organizationId: orgId, type, entityType, entityId },
    orderBy: { createdAt: "desc" },
  });

  const payload: Prisma.InputJsonValue = {
    title: snap.title,
    detail: snap.detail,
    href: snap.href,
    key: keyOf(type, entityType, entityId),
  };

  if (action === "acknowledge") {
    if (existing) {
      await prisma.alert.update({
        where: { id: existing.id },
        data: { status: AlertStatus.acknowledged, acknowledgedAt: new Date(), payload },
      });
    } else {
      await prisma.alert.create({
        data: {
          organizationId: orgId,
          type,
          severity: snap.severity,
          entityType,
          entityId,
          status: AlertStatus.acknowledged,
          acknowledgedAt: new Date(),
          payload,
        },
      });
    }
  } else {
    const now = new Date();
    if (existing) {
      await prisma.alert.update({
        where: { id: existing.id },
        data: {
          status: AlertStatus.closed,
          closedAt: now,
          payload,
        },
      });
    } else {
      await prisma.alert.create({
        data: {
          organizationId: orgId,
          type,
          severity: snap.severity,
          entityType,
          entityId,
          status: AlertStatus.closed,
          closedAt: now,
          payload,
        },
      });
    }
  }

  revalidatePath("/alertas");
  revalidatePath("/tablero");
}
