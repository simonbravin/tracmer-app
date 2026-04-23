import "server-only";

import { currentUser, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@tracmer-app/database";
import type { User } from "@tracmer-app/database";

import { syncClerkUserToDatabase } from "./sync-clerk-user";

/**
 * `userId` de Clerk; null si no hay sesión.
 */
export async function getClerkUserId() {
  const a = await auth();
  return a.userId ?? null;
}

/**
 * En `/(app)` el middleware ya exige sesión; se usa en rutas que lo necesitan explícito.
 */
export async function requireClerkUserId() {
  const id = await getClerkUserId();
  if (!id) {
    redirect("/sign-in");
  }
  return id;
}

/**
 * Garantiza sesión Clerk; útil en Server Components bajo el shell autenticado.
 */
export async function requireClerkUser() {
  const id = await requireClerkUserId();
  const cu = await currentUser();
  if (!cu) {
    redirect("/sign-in");
  }
  return { clerkUser: cu, clerkUserId: id };
}

/**
 * Asegura fila `users` (DB) y bootstrap si aplica. Idempotente.
 */
export async function requireAppUserFromClerk(): Promise<User> {
  await requireClerkUser();
  await syncClerkUserToDatabase();
  const a = await auth();
  if (!a.userId) {
    redirect("/sign-in");
  }
  return prisma.user.findUniqueOrThrow({
    where: { clerkUserId: a.userId },
  });
}
