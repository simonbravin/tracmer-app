import "server-only";

import { prisma } from "@tracmer-app/database";

export async function listReportSchedules(organizationId: string) {
  return prisma.reportSchedule.findMany({
    where: {
      organizationId,
      deletedAt: null,
      reportDefinition: { deletedAt: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      reportDefinition: true,
      recipients: { where: { deletedAt: null } },
    },
  });
}

export async function getReportScheduleForEdit(organizationId: string, scheduleId: string) {
  return prisma.reportSchedule.findFirst({
    where: { id: scheduleId, organizationId, deletedAt: null },
    include: {
      reportDefinition: true,
      recipients: { where: { deletedAt: null } },
    },
  });
}
