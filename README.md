# tracmer-app

Monorepo **pnpm** — control administrativo-financiero (no TMS). Documentación normativa en `docs/`.

## Requisitos

- Node.js ≥ 18.18
- [pnpm](https://pnpm.io/) 9.x (`corepack enable` + `corepack prepare pnpm@9.15.4 --activate`)

## Variables de entorno

- Plantilla en la **raíz**: [`.env.example`](./.env.example) (sin secretos reales; copiá a `.env` o `.env.local` en la raíz o en `apps/web/`).
- **Obligatorias** para el flujo autenticado con DB (ver `apps/web/src/lib/env.ts` con Zod): `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **Opcionales** en esta etapa: `CLERK_WEBHOOK_SECRET` (verificación de webhooks), `DEFAULT_ORGANIZATION_NAME` (bootstrap de org).
- **Solo para CI o build sin conexión real** (no producción): `SKIP_ENV_VALIDATION=1` desactiva la validación estricta; Prisma/Clerk pueden fallar luego con su propio error.

## Primer uso

```bash
cp .env.example .env
# Completar DATABASE_URL y claves Clerk; luego:
pnpm install
pnpm db:generate
pnpm dev
```

`pnpm db:generate` ejecuta `prisma generate` en `packages/database` (necesario tras clonar o cambiar el schema). Sin `DATABASE_URL` válida, el cliente se genera igual, pero `pnpm dev` y las rutas que tocan la DB fallarán al conectar.

## Paquetes

| Ruta | Descripción |
|------|-------------|
| `apps/web` | Next.js (App Router) |
| `packages/database` | Prisma + cliente `@tracmer-app/database` |

## Scripts (raíz)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | App web en desarrollo |
| `pnpm build` | Build producción de la web |
| `pnpm lint` | ESLint de la web |
| `pnpm db:generate` | Cliente Prisma |
| `pnpm db:validate` | Validar `schema.prisma` |
| `pnpm db:migrate:deploy` | Aplicar migraciones en la DB (Neon/Postgres) con `DATABASE_URL` |

## Lockfiles

Este repo usa **solo** `pnpm-lock.yaml` en la raíz. No commitear `package-lock.json` de workspaces; si aparecieron por un `npm install` previo, borrarlos y usar `pnpm install`.

## Deploy en producción

Guía paso a paso (GitHub, Neon, Clerk, Resend, Vercel, migraciones, **cron del job** y pruebas manuales): **[`docs/deploy/DEPLOY.md`](./docs/deploy/DEPLOY.md)**.

Resumen: variables obligatorias `DATABASE_URL`, `CLERK_*` públicas/privadas; en prod configurar `CRON_SECRET` y llamar el job con `Authorization: Bearer …`; Resend si hay mail; `CLERK_WEBHOOK_SECRET` si usás webhooks (firma Svix verificada en el endpoint).

Pendiente de negocio (no bloquea deploy mínimo): procesar eventos concretos en el webhook más allá del ack verificado; hoy el sync de usuario sigue en el layout.

---

Powered by Bloqer.
