/**
 * Lectura alineada a Google provider en `auth.config.ts`: alias típicos de Vercel / plantillas
 * para evitar `invalid_client` por nombres de variables distintos.
 */
export function getGoogleOAuthCredentials(): { id: string; secret: string } | null {
  const id =
    process.env.AUTH_GOOGLE_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const secret =
    process.env.AUTH_GOOGLE_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    return null;
  }
  return { id, secret };
}

export function isGoogleOAuthConfigured(): boolean {
  return getGoogleOAuthCredentials() !== null;
}
