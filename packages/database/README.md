# `@tracmer-app/database`

Paquete del monorepo que concentra **Prisma** + **cliente Postgres** (Neon) para `tracmer-app`. Normativo: `docs/ai/AI_CONTEXT.md`, `docs/architecture/ARCHITECTURE.md`, `docs/product/BUSINESS_RULES.md`, `docs/architecture/ERD_AND_DATA_MODEL.md`, y `prisma/schema.prisma`.

## Uso

1. Definir `DATABASE_URL` (Postgres, p. ej. Neon) en el entorno del workspace (ver [`.env.example`](../.env.example) en la **raíz** del monorepo; Prisma toma `DATABASE_URL` del `process.env` al generar/ migrar / en runtime vía el cliente de `@prisma/client`).
2. Instalar dependencias en la raíz del monorepo o en este package.
3. Generar el cliente: `pnpm prisma:generate` (o `npm run prisma:generate`).

```ts
import { prisma, type Prisma } from "@tracmer-app/database";
```

Consumir desde la app web o jobs importando el package; **no** instanciar `new PrismaClient()` suelto en cada módulo.

## Scripts

| Script | Descripción |
|--------|-------------|
| `prisma:generate` | Genera `@prisma/client` a partir del schema. |
| `prisma:validate` | Valida el schema. |
| `prisma:migrate:dev` | Migraciones en desarrollo. |
| `prisma:migrate:deploy` | Aplicar migraciones (CI/prod). |
| `prisma:migrate:status` | Comparar historial con la base. |
| `prisma:studio` | Prisma Studio. |

Ejecutarlos desde `packages/database` (o vía filtro de workspace del gestor de paquetes).

## Migración inicial

Carpeta `prisma/migrations/20260422120000_init/`: SQL base generado con `prisma migrate diff` respecto a un esquema vacío, más un bloque manual (índices únicos parciales, `CHECK`, trigger de un solo **owner** activo por organización). Con `DATABASE_URL` apuntando a Neon o Postgres (base vacía o limpia para el primer `deploy`):

```bash
# Desde la raíz
pnpm db:migrate:deploy
```

Validación: `pnpm db:validate`; con base conectada, `pnpm --filter @tracmer-app/database exec prisma migrate status`.

## Notas

- El schema vive en `prisma/schema.prisma`. `DATABASE_URL` vía entorno; la comprobación en app web: `getServerEnv` (`@tracmer-app/web`).
- **Seeds** de catálogos: fuera de esta migración (el trigger de owner exige filas en `roles` con `code = 'owner'` solo si se inserta membresía `owner` — el seed o la app la crea).
