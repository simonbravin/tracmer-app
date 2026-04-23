import NextAuth from "next-auth";

import authConfig from "@/auth.config";

/**
 * Instancia Auth.js **sin** Prisma (Edge / middleware). Debe compartir `AUTH_SECRET`
 * y callbacks JWT/session con `auth.ts`.
 */
export const { auth } = NextAuth(authConfig);
