/**
 * En Vercel (VERCEL=1) con DATABASE_URL, aplica migraciones pendientes antes de `next build`.
 * Así el esquema en Neon coincide con el cliente Prisma desplegado.
 * No corre en `pnpm build` local (no VERCEL) para no tocar la base sin intención.
 *
 * Neon + pooler: `prisma migrate deploy` usa advisory locks; a través de PgBouncer suele
 * fallar con P1002 (timeout). Si existe URL directa (sin `-pooler`), se usa solo para este paso.
 * Además se reintenta hasta 4 veces con espera ante fallos transitorios (contención de lock).
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** URL no pooler para migraciones (Neon / integración Vercel). */
function directDatabaseUrlForMigrate(env) {
  return (
    env.DIRECT_URL ||
    env.DATABASE_URL_UNPOOLED ||
    env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

async function runMigrateDeployWithRetries() {
  const migrateEnv = { ...process.env };
  const direct = directDatabaseUrlForMigrate(migrateEnv);
  if (direct) {
    migrateEnv.DATABASE_URL = direct;
    // eslint-disable-next-line no-console
    console.log("[build] Usando conexión directa (sin pooler) para migrate deploy.");
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[build] Sin DIRECT_URL / DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING: migrate usa DATABASE_URL tal cual. En Neon con pooler puede dar P1002; configurá una URL directa en Vercel.",
    );
  }

  const cmd = "pnpm --filter @tracmer-app/database exec prisma migrate deploy";
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync(cmd, {
        stdio: "inherit",
        cwd: root,
        env: migrateEnv,
      });
      return;
    } catch (e) {
      if (attempt === maxAttempts) {
        throw e;
      }
      // eslint-disable-next-line no-console
      console.warn(
        `[build] migrate deploy falló (intento ${attempt}/${maxAttempts}); reintento en 6s (p. ej. advisory lock o red)…`,
      );
      await delay(6000);
    }
  }
}

if (process.env.VERCEL === "1" && process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.log("[build] Vercel: applying Prisma migrations (migrate deploy)…");
  await runMigrateDeployWithRetries();
} else if (process.env.VERCEL === "1" && !process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("[build] Vercel build sin DATABASE_URL: se omite migrate deploy (revisar variables).");
}
