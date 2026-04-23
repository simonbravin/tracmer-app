import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@tracmer-app/database";

import authConfig from "@/auth.config";

const { callbacks: authConfigCallbacks, ...authConfigRest } = authConfig;

const credentials = Credentials({
  id: "credentials",
  name: "Correo y contraseña",
  credentials: {
    email: { label: "Correo", type: "email" },
    password: { label: "Contraseña", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }
    const email = String(credentials.email).trim().toLowerCase();
    const password = String(credentials.password);
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user?.passwordHash) {
      return null;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.displayName ?? user.name ?? email.split("@")[0]!,
      image: user.image ?? undefined,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfigRest,
  adapter: PrismaAdapter(prisma),
  providers: [...(authConfig.providers ?? []), credentials],
  callbacks: {
    ...authConfigCallbacks,
    /**
     * Con JWT + OAuth, asegurar `token.sub` = id en `users` (Prisma). Si `user.id` no viene en el primer JWT,
     * resolvemos por email para que el layout pueda redirigir a onboarding.
     */
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      } else if (user?.email) {
        const email = String(user.email).trim().toLowerCase();
        const row = await prisma.user.findFirst({
          where: { email, deletedAt: null },
          select: { id: true },
        });
        if (row) {
          token.sub = row.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
