import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { getGoogleOAuthCredentials } from "@/lib/auth/google-oauth-env";

const googleCreds = getGoogleOAuthCredentials();

const providers: NextAuthConfig["providers"] = [];
if (googleCreds) {
  providers.push(
    Google({
      clientId: googleCreds.id,
      clientSecret: googleCreds.secret,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

export default {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers,
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/api/auth")) return true;
      if (pathname.startsWith("/login") || pathname.startsWith("/registro")) {
        return true;
      }
      if (pathname.startsWith("/api/jobs/")) return true;
      if (pathname.startsWith("/invitacion")) return true;
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
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
} satisfies NextAuthConfig;
