# Arquitectura técnica — tracmer-app

**Versión:** 1.0  
**Audiencia:** equipo de desarrollo, revisiones técnicas, instrucciones a IA  
**Fuente de contexto de producto:** `docs/ai/AI_CONTEXT.md` (considerado vigente)

Este documento define la arquitectura recomendada para **tracmer-app**: plataforma **administrativo-financiera** para empresas de transporte. **No es un TMS** ni contempla ejecución logística (rutas, flota, dispatch, GPS, etc.).

---

## 1. Objetivos de arquitectura

### 1.1 Qué debe resolver

- Centralizar con claridad el flujo **facturado → cobrado → depositado → conciliado**, con **trazabilidad** y **reglas de negocio determinísticas**.
- Soportar **multi-organización** de forma estructural desde el inicio, sin obligar a una UX enterprise compleja en el MVP.
- Permitir **reportes, exportaciones y automatizaciones** (email) como capacidades de primera clase, no como parches posteriores.
- Mantener **consistencia** de UI/UX y de validaciones entre módulos.
- Facilitar desarrollo asistido por IA: **límites claros** entre capas, convenciones explícitas y **reutilización** sistemática.

### 1.2 Prioridades (orden de importancia operativa)

1. **Claridad** — cualquier desarrollador (o IA) debe saber dónde ubicar lógica nueva.
2. **Consistencia** — patrones únicos para tablas, formularios, permisos, filtros y exportes.
3. **Mantenibilidad** — cambios localizados, bajo acoplamiento entre dominio e infraestructura.
4. **Auditabilidad y seguridad** — acciones sensibles registradas; reglas aplicadas en servidor.
5. **Multi-tenant readiness** — modelo de datos y consultas **siempre** conscientes del `organization_id`.
6. **Escalabilidad razonable** — paginación, índices, jobs y almacenamiento pensados para crecer sin rediseño temprano.
7. **IA-friendly development** — documentos de contexto, convenciones de repo, cambios pequeños y revisables.

---

## 2. Principios arquitectónicos

| Principio | Significado práctico |
|-----------|----------------------|
| **Backend-first** | Reglas de negocio, permisos, límites de moneda/FX, estados y transiciones se aplican en **servidor** (Server Actions, rutas API, jobs). La UI **no** es fuente de verdad ni barrera de seguridad. |
| **Separación de capas** | Dominio (reglas puras) ≠ aplicación (orquestación) ≠ infraestructura (DB, email, R2, Auth.js) ≠ presentación (React). |
| **No duplicación de lógica** | Especialmente: permisos, validación de invariantes, cálculos de equivalentes en moneda, estados de cobranza/conciliación. |
| **No lógica sensible en UI** | La UI puede **sugerir** (ocultar botones), pero el servidor **niega** siempre que corresponda. |
| **Reusabilidad sistemática** | Tablas, filtros, formularios, layouts, tokens, plantillas de email y patrones de export compartidos. |
| **Modularidad por dominio** | Módulos de negocio con fronteras claras (clientes, ventas, cobranzas, bancos, etc.), no “carpetas por tipo de archivo” como único criterio. |
| **Validación consistente** | Esquemas compartidos (p. ej. Zod) para inputs; invariantes adicionales en dominio/servicios. |
| **Auditabilidad** | Auditoría de **quién**, **qué**, **cuándo**, **sobre qué entidad**, con contexto mínimo para reconstrucción. |
| **Idempotencia donde aplique** | Jobs, webhooks futuros, creación de depósitos/conciliaciones masivas: diseño explícito de claves/idempotency keys cuando haya riesgo de doble ejecución. |
| **Crecimiento sin sobreingeniería** | Interfaces estables y datos modelados para integraciones futuras (banco, ARCA, facturación), sin implementar esas integraciones en el MVP. |

---

## 3. Stack técnico recomendado

| Tecnología | Rol | Justificación breve |
|------------|-----|----------------------|
| **Next.js (App Router)** | Framework web full-stack | Rutas, layouts, Server Components, Server Actions, despliegue en Vercel, buen encaje con auth y datos. |
| **React** | UI | Estándar del ecosistema; componentes reutilizables y shell complejo. |
| **TypeScript** | Tipado | Contratos explícitos entre capas; menos errores en dominio financiero. |
| **Tailwind CSS** | Estilos utility-first | Velocidad, consistencia con tokens, integración con shadcn/ui. |
| **shadcn/ui** | Biblioteca de componentes | Base homogénea de UI; control del código en el repo; accesibilidad razonable por defecto. |
| **Auth.js (NextAuth)** | Autenticación | Sesiones JWT, Google OAuth, correo+contraseña y reset por token en app; Prisma como backing store de usuarios y cuentas. |
| **Neon + PostgreSQL** | Base de datos | Postgres gestionado, ramas si hace falta; adecuado para relaciones financieras y constraints. |
| **Prisma** | ORM / acceso a datos | Esquema declarativo, migraciones, tipos generados; conviene para equipo pequeño y flujo con IA. |
| **Resend** | Email transaccional y reportes | API simple; encaja con templates y envíos desde jobs. |
| **Cloudflare R2** | Object storage | Costos y modelo S3-compatible; archivos como datos enlazados a entidades. |
| **Vercel** | Hosting y runtime | Deploy continuo desde GitHub, funciones serverless, Cron/scheduled tasks según evolución del plan. |

**Nota:** La elección de Prisma es coherente con “producción sin improvisación”; si en el futuro se requiere SQL muy específico o edge cases, se puede acotar uso crudo de SQL en repositorios sin romper el modelo por capas.

---

## 4. Estructura del repositorio

### 4.1 Monorepo liviano (recomendado)

Se recomienda **monorepo liviano** (similar en espíritu a enfoques tipo Bloqer): una app web principal y paquetes compartidos con límites claros. Evita divergencia de tipos/validadores entre cliente y servidor y mantiene un solo lugar para convenciones.

### 4.2 Layout propuesto

```text
apps/
  web/                 # Next.js App Router — única aplicación frontend+backend inicial

packages/
  database/            # Prisma schema, cliente, migraciones; sin UI
  ui/                  # Design system: shadcn, tokens, shell, tablas/forms compuestos
  validators/          # Schemas Zod compartidos (inputs, DTOs de API/actions)
  config/              # ESLint/TS/Tailwind presets compartidos (opcional pero útil)
  types/               # Tipos compartidos que no son validación (IDs, enums de dominio publicados)
  email/               # (Opcional) builders de templates React-email o HTML + layout común
  jobs/                # (Opcional) definición compartida de payloads/colas si crece la complejidad

docs/
  ai/
    AI_CONTEXT.md
  architecture/
    ARCHITECTURE.md
```

### 4.3 Rol de cada paquete

| Paquete | Responsabilidad | Por qué separarlo |
|---------|-----------------|-------------------|
| `apps/web` | Rutas, layouts, composición de páginas, Server Actions delgadas, llamada a servicios | Evita mezclar “página” con “regla de negocio pesada”. |
| `packages/database` | Modelo persistente, migraciones, acceso Prisma | Un solo esquema; jobs y web comparten el mismo contrato de datos. |
| `packages/ui` | Shell (sidebar/topbar), componentes de datos, patrones visuales | **Una** forma de tabla/formulario/filtro en el producto. |
| `packages/validators` | Zod schemas compartidos | Misma validación en formulario y en servidor; documentación viva de inputs. |
| `packages/types` | Tipos auxiliares estables | Evita dependencias circulares y mantiene enums/DTOs legibles. |
| `packages/config` | Presets de tooling | Consistencia CI/local sin copiar configs. |
| `docs/` | Contexto producto + arquitectura | Fuente de verdad para humanos e IA. |

**Regla:** Si un archivo mezcla “cómo se ve” con “cómo se calcula el saldo”, probablemente está mal ubicado.

---

## 5. Arquitectura por capas

### 5.1 Vista general

```text
Presentación (React / Server Components)
    ↓ invoca
Actions / Handlers (Server Actions, route handlers) — delgados
    ↓ delegan a
Servicios de aplicación (casos de uso: “Registrar cobranza”, “Conciliar”)
    ↓ usan
Dominio (entidades, invariantes, políticas puras cuando aplique)
    ↓ persisten vía
Repositorios / persistencia (Prisma en implementación)
    ↓ integran
Infraestructura (Resend, R2, Auth.js / bootstrap de usuario, jobs)
```

### 5.2 Dónde vive cada tipo de lógica

| Tipo de lógica | Ubicación recomendada | Qué evitar |
|----------------|----------------------|------------|
| Composición visual, estado de UI | `apps/web` + `packages/ui` | Cálculos financieros definitivos solo aquí. |
| Parsing/validación de entrada | `packages/validators` + verificación en servidor | Validar solo en cliente. |
| Orquestación de caso de uso | Servicios de aplicación en `apps/web` o paquete `application` si crece | Lógica de negocio en componentes React. |
| Reglas duras (invariantes) | Dominio (funciones puras o servicios de dominio) mezcladas con aplicación al inicio; extraer si crecen | Condicionales copy-paste en múltiples actions. |
| Acceso SQL/Prisma | Repositorios / módulos de infraestructura | Prisma esparcido en 50 archivos sin convención. |
| Envío de email, upload a R2 | Adaptadores de infraestructura | Llamar Resend directamente desde un componente cliente. |
| Autenticación | Auth.js (`auth`, middleware, providers) | Credenciales débiles o lógica de permisos fuera del servidor. |

### 5.3 Server Actions y handlers

- Deben ser **delgados**: validar input (con Zod), resolver **organización y usuario**, invocar un **servicio de aplicación**, mapear errores a respuestas UI coherentes.
- No deben contener **SQL** ni detalles de plantillas de email extensas; delegar.

---

## 6. Multi-tenant strategy

### 6.1 Modelo base: `organization_id`

- Toda entidad de negocio principal debe nacer **tenant-scoped** con `organization_id` (o relación clara a una entidad que ya lo incluya).
- Las consultas de lectura/escritura deben **filtrar por organización activa** en el servidor, no confiar en parámetros enviados solo desde el cliente.

### 6.2 Scoping de datos

- **Contexto de request:** tras validar sesión (Auth.js), resolver `userId` → **membresía** en `organization_id` (tabla propia de memberships).
- **Organización activa:** definir explícitamente (header, cookie segura, o segmento de ruta); nunca aceptar `organization_id` arbitrario sin verificar rol en esa org.

### 6.3 Ownership y seguridad

- **Un único `owner` por organización** — constraint a nivel de aplicación + verificación en transacciones al promover/cambiar roles.
- **Aislamiento:** política por defecto “deny”; cualquier lectura/escritura confirma membresía y rol.
- **Datos globales permitidos:** solo lo estrictamente necesario (p. ej. catálogos internos del sistema, feature flags globales si existieran). **Regla:** si duda, es tenant-scoped.

### 6.4 UX multi-tenant

- No es obligatorio construir UI de “selector de empresa” compleja en el MVP si hay una sola org operativa; sí es obligatorio el **modelo de datos** y el **scoping** en servidor desde el día uno.

---

## 7. Auth y access control

### 7.1 División de responsabilidades

| Concern | Responsable |
|---------|-------------|
| Identidad, sesión, login social/correo, recuperación de contraseña | **Auth.js + Postgres (`users`, `accounts`)** |
| Membresía en organización, rol, permisos por módulo/acción | **Aplicación (Postgres)** |
| Enforcement en cada mutación/lectura sensible | **Servidor** |

### 7.2 Roles base

- **`owner`:** único por organización; gestiona equipo, módulos por rol, configuración org, visibilidad completa de auditoría.
- **`admin`:** operación amplia según matriz de permisos (no debe poder violar invariantes de owner único).
- **`operativo`:** uso cotidiano; restricciones crecientes según matriz.

### 7.3 Permisos funcionales

- Los permisos **no** son solo etiquetas: estructura tipo **módulo + acción** (`ventas:export`, `cobranzas:create`, etc.).
- **Módulos activables/desactivables por rol** — configuración persistida; lectura en cada request de negocio relevante (o cache interna con invalidación controlada).

### 7.4 Enforcement

- **Middleware (Auth.js):** autenticación y rutas públicas.
- **Autorización de negocio:** después de sesión, en servidor, con datos de membership; tests de casos críticos recomendados para reglas de owner y exports.

---

## 8. Domain modules

Mapa modular (sin ERD). Cada módulo agrupa casos de uso, entidades y políticas relacionadas.

| Módulo | Responsabilidad principal |
|--------|---------------------------|
| **Clientes** | Directorio de clientes; datos fiscales/comerciales mínimos necesarios para operación financiera. |
| **Contactos** | Personas asociadas a clientes (facturación, cobranzas); puede evolucionar a submódulo de Clientes. |
| **Ventas** | Operaciones facturadas (lo facturado); estado de cobro; fechas y condiciones de crédito; **no** ejecución logística. |
| **Cobranzas** | Dinero/value recibido respecto de ventas; parciales; métodos; vínculo explícito a venta(s). |
| **Bancos / Cuentas bancarias** | Cuentas de la empresa; saldos operativos como **derivados** o snapshots según diseño posterior; límites y moneda por cuenta. |
| **Depósitos** | Movimientos reales ingresados al banco. |
| **Transferencias** | Movimientos entre cuentas propias. |
| **Conciliaciones** | Relación muchos-a-muchos cobranzas ↔ depósitos; diferencias por timing, comisiones, FX. |
| **Alertas** | Reglas/atención (vencimientos, pendientes, desvíos FX, documentación faltante). |
| **Auditoría** | Registro append-only de acciones sensibles y trazas de negocio clave. |
| **Reportes y exportaciones** | Definiciones de reporte, filtros guardados, colas de generación, entrega. |
| **Configuración** | Settings a nivel org y preferencias de usuario cuando aplique. |
| **Usuarios / equipo** | Membresías, roles, invitaciones en app; identidad vía Auth.js; permisos persistidos en app. |

**Principio:** Venta, Cobranza, Depósito y Conciliación son conceptos **separados**; el código no debe colapsarlos en un solo “movimiento genérico” salvo que exista un **motivo de dominio** documentado.

---

## 9. UI architecture

### 9.1 Shell principal

- Inspiración estructural: **Efferd app shell** (variantes 4 u 7): **sidebar** persistente + **topbar** con contexto (org, usuario, tema, ayuda opcional).
- **Layouts anidados** en App Router para no repetir shell.

### 9.2 Patrones obligatorios

| Patrón | Regla |
|--------|--------|
| **Tablas** | Componente/patrón único: paginación, sorting controlado, estados vacíos/carga/error, densidad operativa. |
| **Formularios** | Layout consistente; labels en español; errores alineados con validación Zod. |
| **Filtros** | Barra reutilizable: búsqueda, rango de fechas, filtros de dominio; misma semántica en Tablero y Reportes cuando aplique. |
| **Wizards** | Solo para flujos multi-paso reales (p. ej. conciliación guiada); no fragmentar formularios simples. |
| **Modales / confirmación** | Patrón único para acciones destructivas o irreversibles (archivo, reversión si se permitiera en el futuro). |
| **Empty / loading / error** | Ilustraciones o mensajes sobrios, copy en español (Argentina). |

### 9.3 Theming

- **Light y dark** desde el inicio con **tokens** centralizados (CSS variables + Tailwind).
- **Branding** intercambiable: colores primarios como tokens, no hardcode en páginas.

### 9.4 CSS y duplicidad

- No crear estilos sueltos por página si el token o el componente de `packages/ui` puede cubrirlo.
- Extensiones de Tailwind limitadas y documentadas.

---

## 10. Routing / app structure

Estructura de alto nivel (App Router). Los nombres son orientativos; la jerarquía es la fuente de verdad conceptual.

| Ruta sugerida | Propósito |
|---------------|-----------|
| `/tablero` | Resumen ejecutivo/operativo; filtros; KPIs clave. |
| `/operaciones/ventas` | Listado y detalle de ventas facturadas. |
| `/operaciones/cobranzas` | Cobranzas vinculadas a ventas. |
| `/bancos/cuentas` | Cuentas bancarias. |
| `/bancos/depositos` | Depósitos. |
| `/bancos/transferencias` | Transferencias internas. |
| `/bancos/conciliaciones` | Conciliación cobranzas-depósitos. |
| `/clientes` | Directorio; detalle cliente/contactos. |
| `/reportes` | Reportes analíticos, exportes, programación. |
| `/configuracion/perfil` | Perfil de usuario. |
| `/configuracion/equipo` | Usuarios, roles, invitaciones. |
| `/configuracion/modulos-permisos` | Matriz módulo/acción por rol (owner-centric). |
| `/configuracion/alertas` | Reglas/config de alertas. |
| `/configuracion/organizacion` | Datos generales de la empresa (owner). |

Rutas de autenticación en la app: `/login`, `/registro`, `/login/olvidaste`, `/login/restablecer` y callback `/api/auth/*`.

---

## 11. Data validation strategy

### 11.1 Zod + TypeScript

- **`packages/validators`:** schemas por caso de uso (`createCollectionInput`, `listSalesQuery`).
- **Inferencia de tipos** desde Zod para DTOs de entrada.

### 11.2 Dónde validar

| Capa | Qué valida |
|------|------------|
| Cliente (formulario) | UX inmediata; misma fuente Zod (import compartido). |
| Server Action / handler | **Obligatorio:** shape, rangos, enums, IDs; rechazo con errores estructurados. |
| Dominio / aplicación | Invariantes que requieren lectura de DB (“venta pertenece a org”, “no cobrar más de X salvo política explícita”). |

### 11.3 Evitar duplicación

- Un schema Zod por “comando” o “query” pública.
- No mantener tipos manuales paralelos que contradigan Zod; preferir `z.infer`.

---

## 12. Persistence and database strategy

### 12.1 Prisma + Postgres

- Esquema explícito; migraciones versionadas en `packages/database`.
- Uso de **transacciones** para operaciones que tocan múltiples agregados (p. ej. cobranza + actualización de estado de venta + línea de auditoría).

### 12.2 Soft delete

- Entidades sensibles (ventas, cobranzas, depósitos, clientes, etc.): **`deleted_at` / `archived_at`** por defecto en lugar de borrado físico.
- Borrado físico solo para casos técnicos acotados (PII bajo obligación legal, etc.) y con proceso documentado.

### 12.3 Timestamps

- `created_at`, `updated_at` de forma consistente; considerar `created_by_id` en tablas clave cuando aporte auditoría útil.

### 12.4 Constraints

- FKs con `organization_id` donde corresponda; **unicidades** dentro del tenant (ej. número de factura si aplica).
- Montos en **decimal/numeric** apropiados; evitar float para dinero.

### 12.5 FX y monedas

- **Moneda base: ARS**; monedas iniciales: **ARS y USD**.
- Tipos de cambio y equivalentes son **datos persistidos** en el nivel correcto (venta, cobranza, movimiento bancario), no valores solo calculados en UI sin registro.
- Documentar en implementación futura las reglas exactas de redondeo y momento de cotización (pendiente si no están cerradas).

### 12.6 Idempotencia

- Operaciones repetibles (jobs, imports): diseño con claves naturales o `idempotency_key` donde el negocio lo requiera.

---

## 13. Files and storage architecture

### 13.1 R2 como capa primaria

- Bucket dedicado por entorno; prefijos por `organization_id` y tipo de entidad.
- Servidor genera **URLs prefirmadas** o proxy de descarga con chequeo de permisos (patrón a fijar en implementación: **nunca** confiar en URLs largas sin autorización).

### 13.2 Metadatos en Postgres

- Tabla de **archivos** (o equivalente): `id`, `organization_id`, `uploaded_by_id`, `mime`, `size`, `storage_key`, `sha256` opcional, `linked_entity_type`, `linked_entity_id`, `created_at`, `deleted_at`.
- Los archivos son **datos estructurados**: lifecycle alineado al registro de negocio.

### 13.3 Seguridad y tipos

- Lista blanca de **MIME/extensiones** por caso de uso (PDF, imágenes, hojas de cálculo).
- Límite de tamaño en servidor; antivirus opcional en roadmap sin bloquear diseño.

### 13.4 Convenciones

- Nombres de objeto: inmutables y opacos; nombres legibles solo en metadatos para UI.

---

## 14. Email architecture

### 14.1 Separación contenido / delivery

- **Templates** con layout común (header/footer, branding) en paquete dedicado o carpeta estable.
- **Resend** solo como transporte en adaptador `EmailSender`.

### 14.2 Casos de uso

- Invitaciones a equipo; recuperación de contraseña por enlace (Resend) y otros correos transaccionales propios.
- Reportes programados y envíos manuales de exportes.
- Notificaciones operativas futuras bajo el mismo layout.

### 14.3 Reglas

- Copy en **español (Argentina)**.
- Tablas KPI y bloques legibles en clientes de email; prueba en clientes comunes.
- No proliferar layouts one-off.

---

## 15. Reporting and export architecture

### 15.1 Dos capas

- **Tablero:** agregaciones operativas con filtros; respuesta rápida; sin duplicar todo el motor de reportes si se puede componer de queries reutilizables.
- **Reportes:** análisis más profundo, gráficos, exportes pesados.

### 15.2 Exportaciones

- Formatos: **PDF**, **Excel** (o CSV cuando sea suficiente).
- Generación **en servidor**; descarga por enlace temporal o entrega por email según tamaño/cola.

### 15.3 Filtros guardados y programación

- Entidades conceptuales: **definición de reporte**, **filtros guardados**, **schedule** (cron), **destinatarios**, **plantilla** (visual/email), **historial de ejecución**.
- Permisos: quién puede crear programaciones, para qué datos, y límites de frecuencia (definición operativa pendiente).

---

## 16. Jobs / automations architecture

### 16.1 Objetivo

- Soportar **reportes recurrentes**, **envíos automáticos**, **generación diferida** de exportes pesados, con **estado**, **reintentos** y **logs**.

### 16.2 Enfoque evolutivo

- **Fase inicial:** Vercel Cron invocando endpoints o funciones protegidas por secreto + verificación de idempotencia.
- **Fase crecimiento:** cola dedicada (ej. tabla `job_runs` + worker externo o servicio gestionado) si el volumen o el tiempo de CPU lo exigen.

### 16.3 Registros

- `job_type`, `payload` JSON acotado, `status`, `run_at`, `finished_at`, `error`, `correlation_id`, `organization_id` cuando aplique.

---

## 17. Observability and audit

### 17.1 Audit logs (dominio)

- Append-only; inmutables desde la app.
- Campos mínimos: actor, org, acción, entidad, id de entidad, diff o snapshot resumido, timestamp, metadata (IP/user-agent opcional según política de privacidad).

### 17.2 Logs técnicos

- Logs estructurados en runtime (nivel warn/error para integraciones).
- **No** loguear secretos ni tokens; minimizar PII.

### 17.3 Trazabilidad de negocio

- Eventos clave: creación/edición de venta, cobranza, depósito, conciliación, cambios de permisos, exportes sensibles.

---

## 18. Security principles

- **Enforcement en backend** para permisos e invariantes.
- **Aislamiento estricto por tenant** en cada query/mutación.
- **Archivos:** acceso solo tras chequeo de membresía y vínculo a entidad.
- **No confiar en el frontend** para parámetros de `organization_id` o “rol efectivo”.
- **Validación fuerte** de inputs y de transiciones de estado.
- **Acciones sensibles auditadas** (exports masivos, cambios de roles, conciliaciones).

---

## 19. Performance and scalability considerations

- **Paginación** obligatoria en listados grandes; filtros con índices alineados a consultas reales.
- **Tablas:** virtualización solo si hace falta; priorizar paginación server-side.
- **Agregados del tablero:** queries explícitas o vistas/materializaciones en fases posteriores si el volumen lo exige.
- **Separación de concerns:** no cargar relaciones profundas por defecto; seleccionar campos.
- **UX densa pero legible:** no duplicar componentes pesados por página.

---

## 20. Development conventions

- Cambios **pequeños y auditables**; evitar refactors masivos no solicitados.
- **Leer** `docs/ai/AI_CONTEXT.md` y este documento **antes** de implementar features amplias.
- **Reutilizar** antes de crear: buscar patrón existente en `packages/ui` y en módulos similares.
- **No inventar** producto fuera del alcance (no TMS, no i18n en MVP, etc.).
- **No duplicar** estilos, validadores ni lógica de permisos.
- **Documentar supuestos** en PR o en `docs/` cuando el producto no cierre un detalle.

---

## 21. Future readiness without overengineering

- **Integraciones bancarias / ARCA / facturación externa:** exponer interfaces de aplicación y puntos de extensión (webhooks, conectores) sin implementarlos; evitar tipos de datos que contradigan el modelo financiero propio.
- **Más empresas:** ya cubierto por `organization_id` y memberships.
- **Más módulos:** mantener matriz de permisos extensible; no hardcodear checks dispersos sin convención.
- **Más reportes:** modelo de “definición + filtros + schedule” desde el inicio evita tablas paralelas por cada reporte.

---

## 22. Decisiones abiertas / pendientes

Las siguientes decisiones **no** están cerradas en este documento y deben resolverse en artefactos posteriores (ERD, specs de KPI, runbooks):

| Tema | Qué falta definir |
|------|-------------------|
| Modelo de datos detallado | **ERD** completo; cardinalidades finas entre cobranzas/conciliación/depósitos. |
| KPIs del tablero | Fórmulas exactas, ventanas de tiempo, manejo de moneda mixta en agregados. |
| Matriz de permisos | Lista cerrada de módulos y acciones; defaults por rol; excepciones de owner. |
| Reglas de alertas | Umbrales, severidades, supresiones, asignación. |
| Runtime de jobs | Solo Vercel Cron vs cola externa; límites de tiempo y tamaño de exportes. |
| Estrategia de conciliación UX | Flujo asistido vs edición libre; reversibilidad. |
| Redondeo FX | Política por evento contable; uso de tasa oficial vs operativa. |
| Retención de archivos y PII | Políticas legales/operativas de borrado y anonimización. |
| Ciclo de vida de usuario en Auth.js | Vincular OAuth a `users`; política de borrado/soft delete y revocación de sesiones. |

---

**Fin del documento.** Cualquier desviación respecto de estos lineamientos debe ser **explícita**, **justificada** y **documentada**.
