import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@tracmer-app/database";

import authConfig from "@/auth.config";

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
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [...authConfig.providers, credentials],
});
