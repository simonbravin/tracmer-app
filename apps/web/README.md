# `@tracmer-app/web`

App Next.js (App Router) de **tracmer-app**: shell, tema claro/oscuro, navegación base y rutas placeholder. Auth con **Clerk**; sincronía del usuario a Postgres vía **Prisma** (paquete `@tracmer-app/database`).

## Variables de entorno

La **plantilla** con nombres y comentarios está en la **raíz** del monorepo: [`.env.example`](../../.env.example). Copiá a `.env` o `.env.local` (raíz o este directorio) y completá con valores reales. No commitear secretos.

| Variable | Dónde se valida | Notas |
|----------|-----------------|--------|
| `DATABASE_URL` | `src/lib/env.ts` (servidor) | URL Postgres; obligatoria sin `SKIP_ENV_VALIDATION` al entrar a `(app)` (layout valida) |
| `CLERK_SECRET_KEY` | idem | Dashboard Clerk |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | idem (y pública) | Misma clave; expuesta al bundle cliente |
| `CLERK_WEBHOOK_SECRET` | idem (recomendada en prod con webhook) | Svix: sin ella en prod el POST `/api/webhooks/clerk` devuelve 503 |
| `DEFAULT_ORGANIZATION_NAME` | idem | Opcional: nombre de org en el primer arranque sin orgs |
| `SKIP_ENV_VALIDATION` | — | Si `1`, no se aplica Zod estricto; solo CI/build; **no producción** |
| `RESEND_API_KEY`, `RESEND_FROM` | — (lectura puntual en envío) | Reportes programados por mail; ver `.env.example` |
| `CRON_SECRET` | `POST /api/jobs/run-reports` | En producción obligatorio; ruta **pública para Clerk**, protegida por `Authorization: Bearer` |

- **`getServerEnv()`** (`src/lib/env.ts`, memoizado con `react` `cache`): valida y tipa; mensajes de error en español, sin volcar valores secretos. Usado en el layout de `(app)` (fail-fast).
- **`getPublicEnv()`**: solo `NEXT_PUBLIC_*`; importable en cliente.
- `ClerkProvider` en los layouts; localización vía `src/lib/clerk-locale.ts`. Redirección post sign-in: `/tablero`.

## Scripts

Desde la **raíz del monorepo** (recomendado): `pnpm dev`, `pnpm build`, etc.

Desde `apps/web`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`.

Este package depende de `@tracmer-app/database` (`workspace:*`). Tras `pnpm install` en la raíz, ejecutar `pnpm db:generate` en la raíz si aún no generaste el cliente Prisma.

## Estructura relevante

- `src/app/(auth)/` — rutas públicas (sign-in / sign-up)
- `src/app/(app)/` — zona autenticada (middleware + shell)
- `src/components/layout/` — shell estilo [Efferd App Shell 4](https://efferd.com/blocks/app-shell) (inset, sidebar colapsable + grupos, contenido con padding). Registry opcional: `components.json` → `@efferd` + `EFFERD_REGISTRY_TOKEN` para instalar bloques vía `npx shadcn add`
- `src/components/ui/` — primitives estilo shadcn (migrar a `packages/ui` cuando exista)
- `src/lib/env.ts` — validación Zod (servidor y público), `SKIP_ENV_VALIDATION`
- `src/lib/auth/` — sincronía Clerk → `users`, `getAppRequestContext` (pertenencia org/rol) y requisitos de sesión; importar en servidor (ver `server.ts` con `server-only`)
- `src/lib/tenant.ts` — `getCurrentOrganizationId()` a partir del contexto de app
- `src/app/api/webhooks/clerk/route.ts` — verificación de firma Svix si hay `CLERK_WEBHOOK_SECRET`; procesamiento de eventos mínimo (ver guía deploy)
- Guía deploy: [`docs/deploy/DEPLOY.md`](../../docs/deploy/DEPLOY.md)
