import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isClerkConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const sec = process.env.CLERK_SECRET_KEY?.trim();
  return !!pub && !!sec;
}

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk(.*)",
  /**
   * Protección real: `Authorization: Bearer $CRON_SECRET` en el handler.
   * Sin esto, Clerk bloquea el POST antes de llegar al route (cron / GitHub Actions no tienen sesión).
   */
  "/api/jobs/run-reports(.*)",
]);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (!isClerkConfigured()) {
    return new NextResponse(
      "Falta configurar Clerk en Vercel: agregá NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY y CLERK_SECRET_KEY (Clerk → API Keys), guardá y redeploy. En Clerk, agregá la URL pública del sitio (p. ej. https://tracmer.bloqer.app) en dominios y redirects permitidos.",
      {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }
  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
