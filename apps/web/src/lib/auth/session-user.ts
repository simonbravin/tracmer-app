import "server-only";

import { redirect } from "next/navigation";

import { prisma } from "@tracmer-app/database";
import type { User } from "@tracmer-app/database";

import { auth } from "@/auth";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireSessionUserId(): Promise<string> {
  const id = await getSessionUserId();
  if (!id) {
    redirect("/login");
  }
  return id;
}

export async function requireAppUser(): Promise<User> {
  const id = await requireSessionUserId();
  return prisma.user.findFirstOrThrow({
    where: { id, deletedAt: null },
  });
}
