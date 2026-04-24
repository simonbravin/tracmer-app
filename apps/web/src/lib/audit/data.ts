import "server-only";

import { prisma } from "@tracmer-app/database";

export type AuditLogListRow = {
  id: string;
  occurredAt: Date;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string | null;
  actorName: string | null;
};

const ACTOR_SELECT = { select: { email: true, name: true } as const };

export async function listRecentAuditLogs(
  organizationId: string,
  limit: number,
): Promise<AuditLogListRow[]> {
  const rows = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      occurredAt: true,
      action: true,
      entityType: true,
      entityId: true,
      actor: ACTOR_SELECT,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurredAt,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    actorEmail: r.actor.email,
    actorName: r.actor.name,
  }));
}
