import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@tracmer-app/database";

export async function writeAuditLog(input: {
  organizationId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      payload: input.payload,
    },
  });
}
