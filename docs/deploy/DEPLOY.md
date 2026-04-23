# Guía operativa de deploy — tracmer-app

Monorepo Next.js (`apps/web`) + Postgres (Prisma) + Clerk + opcional Resend y job HTTP de reportes. Sin TMS: control administrativo-financiero.

---

## 1. GitHub

1. Crear repositorio (vacío o con este código).
2. Desde la máquina local: `git remote add origin …` y `git push -u origin main` (o la rama que uses).
3. En Vercel, **Import Project** y elegir ese repo.

---

## 2. Neon (Postgres)

1. En [Neon](https://neon.tech): **Create project** → elegir región cercana a Vercel.
2. Copiar **connection string** (`postgresql://…`). Suele requerirse `?sslmode=require` al final.
3. Guardarla como `DATABASE_URL` (Vercel → Settings → Environment Variables, y en `.env` local).

### Migraciones

- **Cuándo:** después del primer deploy o cada vez que en el repo haya migraciones Prisma nuevas que deban aplicarse a la base de **producción**.
- **Cómo (local contra prod):** en la raíz del monorepo, con `DATABASE_URL` apuntando a Neon prod:

  ```bash
  pnpm install
  pnpm db:migrate:deploy
  ```

- **Cómo (CI):** mismo comando en un paso del pipeline, con el secreto `DATABASE_URL` inyectado (no commitear la URL).

`pnpm db:generate` genera el cliente Prisma; suele ejecutarse en `pnpm install` postinstall del paquete database o en build — revisá el `package.json` raíz si ajustás el pipeline.

---

## 3. Clerk

1. [Clerk Dashboard](https://dashboard.clerk.com) → **Create application** (dev y luego producción, o una sola instancia prod).
2. **API Keys:** copiar **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; **Secret key** → `CLERK_SECRET_KEY` (solo servidor / Vercel).
3. **Paths / URLs:** en Clerk, configurar URLs de la app de producción (y preview si las usás):
   - Dominio de Vercel (`https://tu-proyecto.vercel.app`) o dominio custom.
   - Redirects / allowed origins según la doc de Clerk para Next.js.
4. **Webhook (opcional pero recomendado en prod):** Endpoints → Add Endpoint → URL `https://<tu-dominio>/api/webhooks/clerk` → copiar el **Signing secret** (`whsec_…`) → variable `CLERK_WEBHOOK_SECRET` en Vercel. Sin esto, en **producción** el endpoint responde `503` (no acepta webhooks sin verificar).

La sincronización de usuario a la base ocurre principalmente en el layout (`syncClerkUserToDatabase`). El webhook hoy **solo verifica firma** y responde OK; no reemplaza ese flujo.

---

## 4. Resend (reportes por email)

1. [Resend](https://resend.com): cuenta y **API key** → `RESEND_API_KEY`.
2. Verificar **dominio** o usar remitente de prueba según política de Resend.
3. Variable `RESEND_FROM` con formato `Nombre <noreply@tudominio.com>` (dominio verificado).

Sin estas variables, la UI de reportes programados puede avisar y el envío fallará con mensaje claro al ejecutar el job.

---

## 5. Vercel

1. **New Project** → importar el repo de GitHub.
2. **Root Directory:** si Vercel debe construir solo la app web, configurar `apps/web` (o dejar raíz si el `vercel.json`/build en raíz apunta bien — en este monorepo suele usarse `apps/web` como root del proyecto en Vercel).
3. **Build command (típico):** desde raíz del repo, por ejemplo `pnpm install --frozen-lockfile && pnpm exec turbo run build --filter=@tracmer-app/web` o el script que tengan en `package.json` raíz; lo importante es que `next build` de `apps/web` termine OK.
4. **Install command:** `pnpm install` (con `corepack` para la versión de pnpm del repo).
5. **Variables de entorno** (Production y, si aplica, Preview):

   | Variable | Obligatoria | Notas |
   |----------|-------------|--------|
   | `DATABASE_URL` | Sí | Neon + SSL si aplica |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sí | Pública |
   | `CLERK_SECRET_KEY` | Sí | Servidor |
   | `CLERK_WEBHOOK_SECRET` | Muy recomendada en prod | `whsec_…` del endpoint webhook |
   | `CRON_SECRET` | Sí en prod para el job | Secreto largo aleatorio |
   | `RESEND_API_KEY` | Si hay mail | |
   | `RESEND_FROM` | Si hay mail | Remitente verificado |
   | `DEFAULT_ORGANIZATION_NAME` | No | Bootstrap primer org |
   | `SKIP_ENV_VALIDATION` | **No en prod** | Solo CI sin env real |

6. **Deploy** y revisar logs del build.

---

## 6. Job de reportes: `POST /api/jobs/run-reports`

### Qué es

Un endpoint HTTP que ejecuta el runner de **reportes programados** (lee schedules activos, ventana horaria, idempotencia, genera adjuntos y envía mail vía Resend cuando corresponde).

### Por qué “es público para Clerk”

El **middleware de Clerk** no exige sesión en esta ruta: los crons (Vercel Cron, GitHub Actions, UptimeRobot, etc.) **no tienen cookie de usuario**. La protección es **solo** el header:

```http
Authorization: Bearer <valor de CRON_SECRET>
```

En **producción**, si `CRON_SECRET` no está definido, el handler responde **503** y no ejecuta el job. En desarrollo, sin `CRON_SECRET`, el job puede ejecutarse para pruebas locales (no dejar así una URL pública expuesta).

### Cómo llamarlo manualmente

Reemplazá `BASE` y `TU_SECRETO`:

```bash
curl -X POST "https://BASE/api/jobs/run-reports" \
  -H "Authorization: Bearer TU_SECRETO" \
  -H "Content-Type: application/json"
```

Respuesta JSON con resumen de corridas / errores (ver implementación en `run-scheduled-reports`).

### Vercel Cron (ejemplo)

En el repo podés agregar `vercel.json` (o Cron en dashboard) con algo equivalente a:

```json
{
  "crons": [
    {
      "path": "/api/jobs/run-reports",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Importante:** Vercel Cron invoca la URL con un **Bearer distinto** al vuestro; hoy el código solo valida `CRON_SECRET`. Para Vercel Cron nativo hay que o bien:

- usar **GitHub Actions** / otro scheduler que envíe vuestro `Authorization: Bearer $CRON_SECRET`, o
- extender el handler para aceptar también el header de Vercel (eso sería un cambio de producto/hardening adicional).

**Recomendación pragmática:** usar **GitHub Actions** `schedule` + `curl` con secret en `GITHUB_SECRETS`, o un monitor HTTP que permita header personalizado.

### GitHub Actions (ejemplo concreto)

`.github/workflows/run-reports.yml`:

```yaml
name: Run scheduled reports
on:
  schedule:
    - cron: "15 * * * *" # cada hora, minuto 15 UTC
  workflow_dispatch:

jobs:
  hit:
    runs-on: ubuntu-latest
    steps:
      - name: POST job
        env:
          URL: ${{ secrets.REPORTS_JOB_URL }}
          TOKEN: ${{ secrets.CRON_SECRET }}
        run: |
          curl -sS -X POST "$URL" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -w "\nHTTP %{http_code}\n"
```

Secrets en el repo: `REPORTS_JOB_URL` = `https://tu-dominio.com/api/jobs/run-reports`, `CRON_SECRET` = mismo valor que en Vercel.

### UptimeRobot / scheduler HTTP

Crear monitor tipo **HTTP(s)** → método **POST** → URL del endpoint. Si la herramienta **permite header personalizado**, agregar `Authorization: Bearer …`. Si **no** permite Bearer, ese producto no sirve para este endpoint sin un proxy intermedio.

---

## 7. Verificación manual post-deploy

1. **Login** Clerk → carga `/tablero` (o redirect configurado).
2. **Tablero** con organización activa y KPIs/listas.
3. **Export de reporte** (usuario con permiso `reports.export`) desde la UI.
4. **Job:** `curl` con Bearer (ver arriba) → JSON sin 401/503.
5. **Mail:** si Resend está configurado y hay schedules con destinatarios en ventana, revisar bandeja (y logs de Resend).

---

## 8. Referencias en el repo

- Variables: [`.env.example`](../../.env.example) (raíz del monorepo)
- Validación estricta al entrar a la app: [`apps/web/src/lib/env.ts`](../../apps/web/src/lib/env.ts)
- Middleware (rutas públicas Clerk): [`apps/web/src/middleware.ts`](../../apps/web/src/middleware.ts)
- Job: [`apps/web/src/app/api/jobs/run-reports/route.ts`](../../apps/web/src/app/api/jobs/run-reports/route.ts)
- Webhook: [`apps/web/src/app/api/webhooks/clerk/route.ts`](../../apps/web/src/app/api/webhooks/clerk/route.ts)
