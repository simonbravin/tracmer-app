import "server-only";

/**
 * URL absoluta de la app para enlaces en emails y redirects OAuth.
 */
export function getPublicBaseUrl(): string {
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) {
    return authUrl.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^\/+/, "");
    return host.startsWith("http") ? host : `https://${host}`;
  }
  return "http://localhost:3000";
}
