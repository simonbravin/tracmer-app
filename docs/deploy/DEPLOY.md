# Guía operativa de deploy — tracmer-app

Monorepo Next.js (`apps/web`) + Postgres (Prisma) + Auth.js (NextAuth) + opcional Resend y job HTTP de reportes. Sin TMS: control administrativo-financiero.

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

El cliente Prisma se genera con el schema en `packages/database`: hay un **`postinstall`** en ese paquete (`prisma generate`) y un **`prebuild`** en `apps/web` que vuelve a ejecutar `prisma generate` antes de `next build` (útil en Vercel para que `@prisma/client` en la app tenga enums y tipos al chequear TypeScript).

---

## 3. Auth.js (NextAuth)

1. **`AUTH_SECRET`:** generar con `openssl rand -base64 32` y cargarlo en Vercel (Production / Preview).
2. **`AUTH_URL`:** URL pública de la app (p. ej. `https://tracmer.bloqer.app`). Mejora callbacks OAuth y enlaces en emails.
3. **Google (opcional):** en [Google Cloud Console](https://console.cloud.google.com/) crear OAuth Client (Web) → autorizar redirect `https://<dominio>/api/auth/callback/google` → `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`.
4. **Correo + contraseña:** registro en `/registro`; recuperación en `/login/olvidaste` requiere `RESEND_API_KEY` y `RESEND_FROM`.
5. El **bootstrap** de organización y membresía `owner` (primer inquilino sin orgs) ocurre en el layout de `(app)` tras validar la sesión.

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
   | `AUTH_SECRET` | Sí | JWT / sesión Auth.js |
   | `AUTH_URL` | Muy recomendada en prod | URL pública de la app |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No | OAuth Google |
   | `CRON_SECRET` | Sí en prod para el job | Secreto largo aleatorio |
   | `RESEND_API_KEY` | Si hay mail / reset password | |
   | `RESEND_FROM` | Si hay mail | Remitente verificado |
   | `DEFAULT_ORGANIZATION_NAME` | No | Bootstrap primer org |
   | `SKIP_ENV_VALIDATION` | **No en prod** | Solo CI sin env real |

   **Cómo cargarlas en el dashboard de Vercel:** proyecto → **Settings** → **Environment Variables** → **Add New**. Elegí el nombre exacto de la fila (p. ej. `AUTH_SECRET`), el valor, y marcá en qué entornos aplica (**Production**, **Preview**, **Development**). Para secretos, activá **Sensitive** si tu plan lo ofrece. Guardá y redeployá (o **Redeploy** del último deployment) para que los nuevos valores lleguen al runtime.

   Eliminá variables de entorno de cualquier proveedor de autenticación que ya no uses, para no dejar secretos huérfanos.

6. **Deploy** y revisar logs del build.

---

## 6. Job de reportes: `POST /api/jobs/run-reports`

### Qué es

Un endpoint HTTP que ejecuta el runner de **reportes programados** (lee schedules activos, ventana horaria, idempotencia, genera adjuntos y envía mail vía Resend cuando corresponde).

### Por qué “es público en el middleware”

El **middleware de Auth.js** deja esta ruta **sin** exigir sesión: los crons (Vercel Cron, GitHub Actions, UptimeRobot, etc.) **no tienen cookie de usuario**. La protección es **solo** el header:

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

1. **Login** en `/login` (Google y/o correo) → carga `/tablero`.
2. **Tablero** con organización activa y KPIs/listas.
3. **Export de reporte** (usuario con permiso `reports.export`) desde la UI.
4. **Job:** `curl` con Bearer (ver arriba) → JSON sin 401/503.
5. **Mail:** si Resend está configurado y hay schedules con destinatarios en ventana, revisar bandeja (y logs de Resend).

---

## 8. Referencias en el repo

- Variables: [`.env.example`](../../.env.example) (raíz del monorepo)
- Validación estricta al entrar a la app: [`apps/web/src/lib/env.ts`](../../apps/web/src/lib/env.ts)
- Middleware (Auth.js, rutas públicas): [`apps/web/src/middleware.ts`](../../apps/web/src/middleware.ts)
- Auth: [`apps/web/src/auth.ts`](../../apps/web/src/auth.ts), [`apps/web/src/auth.config.ts`](../../apps/web/src/auth.config.ts)
- Job: [`apps/web/src/app/api/jobs/run-reports/route.ts`](../../apps/web/src/app/api/jobs/run-reports/route.ts)
