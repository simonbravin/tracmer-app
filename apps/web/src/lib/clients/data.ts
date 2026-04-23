import "server-only";

import { prisma } from "@tracmer-app/database";
import type { Prisma } from "@prisma/client";

export async function listClients(
  orgId: string,
  options: {
    q?: string;
    estado: "activos" | "archivados" | "todos";
    page: number;
    pageSize: number;
  },
) {
  const { q, estado, page, pageSize } = options;
  const where: Prisma.ClientWhereInput = { organizationId: orgId };
  if (estado === "activos") where.deletedAt = null;
  else if (estado === "archivados") where.deletedAt = { not: null };
  const t = q?.trim();
  if (t) {
    const digits = t.replace(/\D/g, "");
    const or: Prisma.ClientWhereInput[] = [
      { legalName: { contains: t, mode: "insensitive" } },
      { displayName: { contains: t, mode: "insensitive" } },
    ];
    if (digits.length > 0) {
      or.push({ taxId: { contains: digits, mode: "insensitive" } });
    }
    where.OR = or;
  }
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        legalName: true,
        displayName: true,
        taxId: true,
        deletedAt: true,
        createdAt: true,
        _count: { select: { contacts: { where: { deletedAt: null } } } },
      },
    }),
    prisma.client.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getClientById(organizationId: string, id: string) {
  return prisma.client.findFirst({
    where: { id, organizationId },
    include: {
      contacts: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
    },
  });
}
