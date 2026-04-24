# `@tracmer-app/web`

App Next.js (App Router) de **tracmer-app**: shell, tema claro/oscuro, navegación y módulos de negocio. Auth con **Auth.js (NextAuth v5)** + **Prisma** (`@tracmer-app/database`): Google opcional, correo+contraseña, recuperación de contraseña vía Resend.

## Variables de entorno

La **plantilla** con nombres y comentarios está en la **raíz** del monorepo: [`.env.example`](../../.env.example). Copiá a `.env` o `.env.local` (raíz o este directorio) y completá con valores reales. No commitear secretos.

| Variable | Dónde se valida | Notas |
|----------|-----------------|--------|
| `DATABASE_URL` | `src/lib/env.ts` (servidor) | URL Postgres; obligatoria sin `SKIP_ENV_VALIDATION` al entrar a `(app)` (layout valida) |
| `AUTH_SECRET` | idem | Secreto JWT/sesión Auth.js |
| `AUTH_URL` | idem | URL absoluta de la app (recomendada en prod; OAuth y emails) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | idem (opcionales) | OAuth Google |
| `RESEND_API_KEY` / `RESEND_FROM` | envío de mails | Obligatorias para “olvidé contraseña” y reportes por mail |
| `NEXT_PUBLIC_APP_URL` | `getPublicEnv()` | Opcional; enlaces absolutos en cliente |
| `DEFAULT_ORGANIZATION_NAME` | idem | Opcional (reservado; el nombre de org se define en onboarding) |
| `SKIP_ENV_VALIDATION` | — | Si `1`, no se aplica Zod estricto; solo CI/build; **no producción** |
| `CRON_SECRET` | `POST /api/jobs/*` (reportes, alertas) | En producción obligatorio; rutas bajo `/api/jobs/`, sin sesión, protegidas por `Authorization: Bearer` |

- **`getServerEnv()`** (`src/lib/env.ts`, memoizado con `react` `cache`): valida y tipa; mensajes de error en español, sin volcar valores secretos. Usado en el layout de `(app)` (fail-fast).
- **`getPublicEnv()`**: solo variables públicas seguras para el cliente.
- Rutas de auth: `/login`, `/registro`, `/login/olvidaste`, `/login/restablecer`. Tras login: `/tablero`.

## Scripts

Desde la **raíz del monorepo** (recomendado): `pnpm dev`, `pnpm build`, etc.

Desde `apps/web`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`.

Este package depende de `@tracmer-app/database` (`workspace:*`). Tras `pnpm install` en la raíz, ejecutar `pnpm db:generate` en la raíz si aún no generaste el cliente Prisma.

## Estructura relevante

- `src/app/(auth)/` — login, registro, recuperación de contraseña
- `src/app/(app)/` — zona autenticada (middleware + shell)
- `src/app/api/auth/` — NextAuth (`[...nextauth]`) y registro / reset
- `src/auth.ts` / `src/auth.config.ts` / `src/auth.edge.ts` — configuración Auth.js (edge sin Prisma en `auth.edge`)
- `src/components/layout/` — shell (sidebar, header, menú móvil)
- `src/components/ui/` — primitives estilo shadcn
- `src/lib/env.ts` — validación Zod (servidor y público), `SKIP_ENV_VALIDATION`
- `src/lib/auth/` — sesión, `getAppRequestContext` (pertenencia org/rol) y helpers; `src/lib/organization/` — creación de org owner; en código servidor que no debe bundlearse al cliente, usar `"server-only"` donde corresponda
- `src/lib/clients/require-organization.ts` — contexto de org activa para acciones y páginas (`requireOrganizationContext`)
