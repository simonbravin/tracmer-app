import { cache } from "react";
import { z } from "zod";

const skipValidation = () => process.env.SKIP_ENV_VALIDATION === "1";

const serverSchema = z.object({
  /** URL de conexión Postgres (Prisma). */
  DATABASE_URL: z
    .string()
    .min(1, "Falta DATABASE_URL")
    .url("DATABASE_URL debe ser una URL (p. ej. postgresql://user:pass@host/db)"),
  /** NextAuth / Auth.js — generar con `openssl rand -base64 32`. */
  AUTH_SECRET: z.string().min(1, "Falta AUTH_SECRET"),
  /** URL canónica (https://…). Vacío = inferir desde el request en desarrollo. */
  AUTH_URL: z.string().optional().default(""),
  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),
  /** Solo requerida para “olvidé contraseña” y otros mails transaccionales. */
  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM: z.string().optional().default(""),
  /** Reservado (onboarding en UI); puede usarse como default futuro. */
  DEFAULT_ORGANIZATION_NAME: z.string().optional().default(""),
});

export type ServerEnv = {
  databaseUrl: string;
  authSecret: string;
  authUrl: string | undefined;
  authGoogleId: string | undefined;
  authGoogleSecret: string | undefined;
  resendApiKey: string | undefined;
  resendFrom: string | undefined;
  defaultOrganizationName: string | undefined;
};

function toServerEnv(p: z.infer<typeof serverSchema>): ServerEnv {
  const n = p.DEFAULT_ORGANIZATION_NAME?.trim();
  const authUrlRaw = p.AUTH_URL?.trim();
  let authUrl: string | undefined;
  if (authUrlRaw && authUrlRaw.length > 0) {
    try {
      new URL(authUrlRaw);
      authUrl = authUrlRaw;
    } catch {
      throw new Error("AUTH_URL debe ser una URL absoluta válida (https://…)");
    }
  }
  const gid = p.AUTH_GOOGLE_ID?.trim();
  const gsec = p.AUTH_GOOGLE_SECRET?.trim();
  const rk = p.RESEND_API_KEY?.trim();
  const rf = p.RESEND_FROM?.trim();
  return {
    databaseUrl: p.DATABASE_URL,
    authSecret: p.AUTH_SECRET,
    authUrl: authUrl && authUrl.length > 0 ? authUrl : undefined,
    authGoogleId: gid && gid.length > 0 ? gid : undefined,
    authGoogleSecret: gsec && gsec.length > 0 ? gsec : undefined,
    resendApiKey: rk && rk.length > 0 ? rk : undefined,
    resendFrom: rf && rf.length > 0 ? rf : undefined,
    defaultOrganizationName: n && n.length > 0 ? n : undefined,
  };
}

function serverEnvFromProcessSkip(): ServerEnv {
  const s = process.env;
  return {
    databaseUrl: s.DATABASE_URL ?? "",
    authSecret: s.AUTH_SECRET ?? "",
    authUrl: s.AUTH_URL?.trim() || undefined,
    authGoogleId: s.AUTH_GOOGLE_ID?.trim() || undefined,
    authGoogleSecret: s.AUTH_GOOGLE_SECRET?.trim() || undefined,
    resendApiKey: s.RESEND_API_KEY?.trim() || undefined,
    resendFrom: s.RESEND_FROM?.trim() || undefined,
    defaultOrganizationName: s.DEFAULT_ORGANIZATION_NAME?.trim() || undefined,
  };
}

function formatZodError(flat: z.ZodError) {
  const issues = flat.issues
    .map((i) => {
      const path = i.path.length > 0 ? i.path.join(".") : "env";
      return `${path}: ${i.message}`;
    })
    .join("; ");
  return `Configuración de entorno inválida. ${issues}. Revisá .env.example en la raíz del monorepo.`;
}

/**
 * Variables de servidor: solo RSC, Server Actions, `route`, etc.
 * Idempotente por request (React `cache`). No reenviar a componentes cliente.
 */
export const getServerEnv = cache((): ServerEnv => {
  if (skipValidation()) {
    return serverEnvFromProcessSkip();
  }
  const raw = {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL ?? "",
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? "",
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    RESEND_FROM: process.env.RESEND_FROM ?? "",
    DEFAULT_ORGANIZATION_NAME: process.env.DEFAULT_ORGANIZATION_NAME ?? "",
  };
  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return toServerEnv(parsed.data);
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

export type PublicEnv = {
  appUrl: string | undefined;
};

/**
 * Lectura pública; seguro importar en el cliente.
 */
export function getPublicEnv(): PublicEnv {
  const raw = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "Variables públicas de entorno inválidas. Revisá .env.example en la raíz.",
    );
  }
  const u = parsed.data.NEXT_PUBLIC_APP_URL?.trim();
  return {
    appUrl: u && u.length > 0 ? u : undefined,
  };
}
