import { NextResponse } from "next/server";

import { auth as edgeAuth } from "@/auth.edge";

function isAuthConfigured(): boolean {
  return !!process.env.AUTH_SECRET?.trim();
}

export default edgeAuth(() => {
  if (!isAuthConfigured()) {
    return new NextResponse(
      "Falta AUTH_SECRET en el entorno (Auth.js). Generá uno con openssl rand -base64 32, cargalo en Vercel y redeploy.",
      {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
