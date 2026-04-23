/**
 * En Vercel (VERCEL=1) con DATABASE_URL, aplica migraciones pendientes antes de `next build`.
 * Así el esquema en Neon coincide con el cliente Prisma desplegado.
 * No corre en `pnpm build` local (no VERCEL) para no tocar la base sin intención.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

if (process.env.VERCEL === "1" && process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.log("[build] Vercel: applying Prisma migrations (migrate deploy)…");
  execSync("pnpm --filter @tracmer-app/database exec prisma migrate deploy", {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
} else if (process.env.VERCEL === "1" && !process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("[build] Vercel build sin DATABASE_URL: se omite migrate deploy (revisar variables).");
}
