import { cache } from "react";
import { z } from "zod";

const skipValidation = () => process.env.SKIP_ENV_VALIDATION === "1";

const serverSchema = z.object({
  /** URL de conexión Postgres (Prisma). */
  DATABASE_URL: z
    .string()
    .min(1, "Falta DATABASE_URL")
    .url("DATABASE_URL debe ser una URL (p. ej. postgresql://user:pass@host/db)"),
  CLERK_SECRET_KEY: z
    .string()
    .min(1, "Falta CLERK_SECRET_KEY (dashboard Clerk)"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Falta NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (dashboard Clerk)"),
  /** Solo requerida cuando se verifiquen webhooks; vacío = aún no configurada. */
  CLERK_WEBHOOK_SECRET: z.string().optional().default(""),
  /** Override del nombre de org en bootstrap. */
  DEFAULT_ORGANIZATION_NAME: z.string().optional().default(""),
});

export type ServerEnv = {
  /** Conexión Postgres (no incluir en mensajes de error con datos sensibles). */
  databaseUrl: string;
  clerkSecretKey: string;
  /** Misma clave pública, validada junto al resto. */
  clerkPublishableKey: string;
  /** Puede faltar mientras el webhook no verifique. */
  clerkWebhookSecret: string | undefined;
  defaultOrganizationName: string | undefined;
};

function toServerEnv(p: z.infer<typeof serverSchema>): ServerEnv {
  const n = p.DEFAULT_ORGANIZATION_NAME?.trim();
  const wh = p.CLERK_WEBHOOK_SECRET?.trim();
  return {
    databaseUrl: p.DATABASE_URL,
    clerkSecretKey: p.CLERK_SECRET_KEY,
    clerkPublishableKey: p.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    clerkWebhookSecret: wh && wh.length > 0 ? wh : undefined,
    defaultOrganizationName: n && n.length > 0 ? n : undefined,
  };
}

function serverEnvFromProcessSkip(): ServerEnv {
  const s = process.env;
  return {
    databaseUrl: s.DATABASE_URL ?? "",
    clerkSecretKey: s.CLERK_SECRET_KEY ?? "",
    clerkPublishableKey: s.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
    clerkWebhookSecret:
      s.CLERK_WEBHOOK_SECRET && s.CLERK_WEBHOOK_SECRET.length > 0
        ? s.CLERK_WEBHOOK_SECRET
        : undefined,
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
  // No se incluyen los valores "received" (evita fugas en logs de error).
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
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET ?? "",
    DEFAULT_ORGANIZATION_NAME: process.env.DEFAULT_ORGANIZATION_NAME ?? "",
  };
  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return toServerEnv(parsed.data);
});

const publicSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
});

export type PublicEnv = {
  /** Prefijo `NEXT_PUBLIC_` — seguro de exponer en el cliente. */
  clerkPublishableKey: string | undefined;
};

/**
 * Lectura pública; seguro importar en el cliente. No toca claves de servidor.
 */
export function getPublicEnv(): PublicEnv {
  const raw = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "Variables públicas de entorno inválidas. Revisá .env.example en la raíz.",
    );
  }
  const k = parsed.data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return {
    clerkPublishableKey: k && k.length > 0 ? k : undefined,
  };
}
