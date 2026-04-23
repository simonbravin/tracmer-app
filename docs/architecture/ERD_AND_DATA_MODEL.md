# ERD y modelo de datos — tracmer-app

**Versión:** 1.0  
**Normativo:** `docs/ai/AI_CONTEXT.md`, `docs/architecture/ARCHITECTURE.md`, `docs/product/BUSINESS_RULES.md`  
**No normativo:** este documento no introduce reglas de negocio nuevas; donde el negocio está **pendiente**, se marca **PENDIENTE** sin asumir.

**Objetivo:** modelo **conceptual + lógico** suficientemente preciso para generar **Prisma** sin ambigüedad mayor, minimizando rediseños y duplicación de entidades.

**Convenciones de nombres:** tablas en **snake_case** plural (estilo Postgres/Prisma común). Conceptos en español del negocio se mapean a inglés técnico (`sales`, `collections`, …).

---

## 1. Principios del modelo de datos

| Principio | Aplicación en el modelo |
|-----------|-------------------------|
| **Multi-tenant** | Toda fila de negocio lleva `organization_id` (salvo catálogos globales y tablas puramente técnicas sin tenant). FKs compuestas lógicas: hijo referencia padre **y** comparte `organization_id` donde aplique (validación en app/DB según estrategia elegida). |
| **Soft delete** | `deleted_at TIMESTAMPTZ NULL` en entidades operativas listadas en §11. **No** en `audit_logs` (append-only). |
| **Auditoría** | Tabla `audit_logs` inmutable desde la aplicación; eventos de negocio sensibles obligatorios según `BUSINESS_RULES` §15. |
| **Consistencia financiera** | Montos `NUMERIC` (no float); invariantes de imputación y conciliación en transacciones; líneas de asignación nunca exceden saldos pendientes (validado al cerrar). |
| **Evitar duplicación** | Un solo lugar canónico para “total a cobrar” de venta (ver §2 `sales` / `sale_lines`); FX en columnas explícitas por evento, no recalculado silenciosamente en histórico. |
| **Conciliación N:M** | Solo vía `reconciliation_lines` entre `collections` y `bank_deposits` (BR §2, §8). |
| **FX persistido** | Tasas y equivalentes en columnas documentadas en §5 y en entidades/líneas correspondientes (BR §10). |

---

## 2. Entidades principales

### 2.1 organizations

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Tenant; agrupa datos y configuración. |
| **Campos principales** | `id` (UUID/PK), `name`, `legal_name` (opcional), `timezone` (default `America/Argentina/Buenos_Aires` alineado a BR), `created_at`, `updated_at`, `deleted_at` (opcional; si la org se “archiva”, soft delete). |
| **Relaciones** | 1:N `memberships`, `clients`, `sales`, `collections`, `bank_accounts`, … |

---

### 2.2 users

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Identidad de aplicación enlazada a **Auth.js (NextAuth)** vía Prisma: correo/contraseña (hash en app) y cuentas OAuth (`accounts`). |
| **Campos principales** | `id`, `email` **UNIQUE**, `name`, `email_verified`, `image`, `password_hash` (nullable si solo OAuth), `display_name`, `avatar_file_id` **PENDIENTE** (FK opcional a `files`), `created_at`, `updated_at`, `deleted_at` (soft delete de perfil en app). |
| **Relaciones** | 1:N `accounts` (OAuth), `password_reset_tokens`; N:M organizaciones vía `memberships`; actor en `audit_logs`, `report_runs`, etc. |

---

### 2.3 memberships

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Usuario ↔ organización con rol base y flags de membresía. |
| **Campos principales** | `id`, `organization_id` **FK**, `user_id` **FK**, `role_id` **FK → roles** (códigos `owner` \| `admin` \| `operativo`), `status` (`active` \| `invited` \| `suspended`) **PENDIENTE** catálogo cerrado, `created_at`, `updated_at`, `deleted_at`. |
| **Restricciones** | **UNIQUE** `(organization_id, user_id)` donde `deleted_at IS NULL`. **A lo sumo un `owner` por organización:** ver §10 (índice único parcial o constraint validado en transacción). |
| **Relaciones** | N:1 `organizations`, `users`, `roles`. |

---

### 2.4 roles

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Catálogo fijo de roles base (integridad referencial). |
| **Campos principales** | `id`, `code` **UNIQUE** (`owner`, `admin`, `operativo`), `display_name`, `sort_order`. |
| **Relaciones** | Referenciado por `memberships`, `organization_role_enabled_modules`, `organization_role_permissions`. |
| **Nota** | No hay “roles custom” por org en MVP salvo **PENDIENTE** futuro; solo estos tres códigos. |

---

### 2.5 Catálogo de permisos y matriz (equiv. a `role_permissions` + `enabled_modules_by_role`)

`BUSINESS_RULES` §12 exige **matriz persistida** (módulo + acción por rol por organización). El prompt lista `role_permissions` y `enabled_modules_by_role` como nombres conceptuales; el modelo lógico se descompone así:

#### 2.5.1 app_modules

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Catálogo global de módulos (`ventas`, `cobranzas`, `bancos`, `clientes`, `reportes`, `configuracion`, `auditoria`, … — lista cerrada **PENDIENTE** en producto BR §16.10). |
| **Campos** | `id`, `code` **UNIQUE**, `display_name`. |

#### 2.5.2 permission_definitions

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Granularidad **módulo + acción** (`view`, `create`, `edit`, `archive`, `export`, `send`, `manage`, … lista cerrada **PENDIENTE**). |
| **Campos** | `id`, `module_id` **FK → app_modules**, `action_code` (text o enum), **UNIQUE** `(module_id, action_code)`. |

#### 2.5.3 organization_role_enabled_modules (equiv. **enabled_modules_by_role**)

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Módulo **habilitado** para un `role` dentro de una `organization` (visibilidad base). |
| **Campos** | `id`, `organization_id`, `role_id`, `module_id`, `is_enabled` (bool), `updated_at`, `updated_by_user_id` **opcional**. |
| **UNIQUE** | `(organization_id, role_id, module_id)`. |

#### 2.5.4 organization_role_permissions (equiv. **role_permissions**)

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Concesión explícita de una `permission_definition` a un `role` en una `organization`. |
| **Campos** | `id`, `organization_id`, `role_id`, `permission_definition_id`, `is_allowed` (bool), `updated_at`, `updated_by_user_id` **opcional**. |
| **UNIQUE** | `(organization_id, role_id, permission_definition_id)`. |

**Resolución en runtime (BR §12.2):** dado `user`, `organization`, `role` de su `membership`: si `role = owner` → **bypass** “todo permitido” sin depender de filas materializadas **o** materializar grants; **PENDIENTE** estrategia (código debe ser único). Para `admin`/`operativo`: `is_allowed` debe ser true y módulo `is_enabled` true para el módulo padre de esa permission.

**No** duplicar lógica en checks hardcodeados por pantalla: la autorización lee estas tablas (o proyección en caché invalidable).

---

### 2.6 clients

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Directorio de clientes de la org. |
| **Campos** | `id`, `organization_id`, `legal_name`, `tax_id` **PENDIENTE** nombre/cuit AR, `display_name`, `notes`, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id` opcional. |
| **Relaciones** | 1:N `client_contacts`, `sales` (nullable `client_id` si BR §16.12 permite ventas sin cliente — **PENDIENTE**; hasta entonces nullable + CHECK **PENDIENTE** o `NOT NULL`). |

---

### 2.7 client_contacts

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Contactos asociados a un cliente. |
| **Campos** | `id`, `organization_id`, `client_id`, `name`, `email`, `phone`, `role_label` (texto libre operativo), `created_at`, `updated_at`, `deleted_at`. |

---

### 2.8 sales

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Operación facturada (BR §1.1). |
| **Campos** | `id`, `organization_id`, `client_id` (nullable **PENDIENTE** BR §16.12), `status` enum alineado a BR §3 (`draft` \| `issued` \| `partially_collected` \| `collected` \| `overdue` \| `cancelled` — mapeo i18n interno en inglés o español **PENDIENTE** convención Prisma), `invoice_date` (date), `credit_days` (int ≥ 0), `currency_code` (`ARS` \| `USD`), `total_amount` **NUMERIC** (total a cobrar en `currency_code`, BR §3.2), `fx_rate_ars_per_unit_usd_at_issue` **NUMERIC NULL** (BR §10.2; paridad 1 o NULL si moneda ARS), `amount_ars_equivalent_at_issue` **NUMERIC NULL** (opcional denormalizado para reportes rápidos; debe ser coherente con tasa), `invoice_number` **opcional** string, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`, `updated_by_user_id` opcionales. |
| **Relaciones** | N:1 `clients`; 1:N `sale_lines`, `collection_allocations`. |
| **Nota estado `overdue`:** puede persistirse o calcularse; si se persiste, debe recalcularse en mutaciones relevantes (BR §3). **PENDIENTE** estrategia persistido vs vista. |

---

### 2.9 sale_lines

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Soporte a multi-línea cuando el producto lo active (BR §3.2, §16.13). |
| **Campos** | `id`, `organization_id`, `sale_id`, `line_number` (int), `description` nullable, `quantity` **NUMERIC** default 1, `unit_amount` **NUMERIC** (en moneda de la venta), `line_total_amount` **NUMERIC** (denormalizado `quantity * unit` o almacenado explícito), `created_at`, `updated_at`, `deleted_at`. |
| **Relaciones** | N:1 `sales`. |
| **Regla MVP** | Si el MVP usa **solo** `sales.total_amount` sin líneas: `sale_lines` vacío **o** exactamente una línea espejo — **PENDIENTE** decisión única; hasta entonces implementación debe elegir una y documentar constraint/trigger **PENDIENTE**. |

---

### 2.10 collections

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Cobranza (BR §1.2, §5). |
| **Campos** | `id`, `organization_id`, `gross_amount` **NUMERIC** > 0, `currency_code` (`ARS` \| `USD`), `collection_date` (date), `payment_method_code` **PENDIENTE** FK catálogo BR §16.2, `status` (`valid` \| `voided`), `voided_at`, `void_reason`, `notes`, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`. |
| **FX** | `amount_ars_equivalent` **NUMERIC NULL** + `fx_rate_ars_per_unit_usd_at_collection` **NUMERIC NULL** según necesidad de KPIs BR §9 (persistido BR §10). |
| **Relaciones** | 1:N `collection_allocations`, `collection_fees`, `reconciliation_lines`, `files` (polimórfico §8). |

---

### 2.11 collection_allocations (cobranza → venta)

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Imputación N:M cobranza ↔ venta con tasa por línea (BR §2, §5, §10). |
| **Campos** | `id`, `organization_id`, `collection_id`, `sale_id`, `amount_in_collection_currency` **NUMERIC**, `fx_rate_to_sale_currency` **NUMERIC** (tasa que convierte monto en moneda cobranza → moneda venta; si misma moneda = 1), `amount_in_sale_currency` **NUMERIC** (redundante controlable; o generado solo en lectura — **PENDIENTE** denormalización vs check), `created_at`, `updated_at`, `deleted_at`. |
| **Restricción** | `SUM(amount_in_collection_currency) OVER allocations of a collection ≤ collection.gross_amount` (tolerancia BR §16.5 **PENDIENTE**). |

---

### 2.12 collection_fees

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Gastos/comisiones asociados a una cobranza (BR §5.2). |
| **Campos** | `id`, `organization_id`, `collection_id`, `amount` **NUMERIC**, `currency_code`, `fx_rate_to_collection_currency` **NUMERIC** (BR §5.2), `description`, `created_at`, `updated_at`, `deleted_at`. |

---

### 2.13 bank_accounts

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Cuenta bancaria de la empresa en la org. |
| **Campos** | `id`, `organization_id`, `name`, `bank_name`, `currency_code` (`ARS` \| `USD`), `account_identifier_masked`, `is_active`, `created_at`, `updated_at`, `deleted_at`. |
| **Relaciones** | 1:N `bank_deposits` (destino), `bank_transfers` (origen/destino). |

---

### 2.14 bank_deposits

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Depósito bancario real (BR §1.3, §6). |
| **Campos** | `id`, `organization_id`, `bank_account_id`, `deposit_date` (date), `amount` **NUMERIC**, `currency_code`, `reference` texto opcional, `fx_rate_ars_per_unit_usd_at_deposit` **NUMERIC NULL**, `amount_ars_equivalent` **NUMERIC NULL**, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`. |
| **Relaciones** | N:1 `bank_accounts`; 1:N `reconciliation_lines`. |

---

### 2.15 bank_transfers

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Transferencia entre cuentas propias (BR §1.4, §7). |
| **Campos** | `id`, `organization_id`, `from_bank_account_id`, `to_bank_account_id`, `transfer_date` (date), `amount` **NUMERIC**, `currency_code` (debe ser coherente con cuentas — validación app), `fee_amount` **NUMERIC NULL** **PENDIENTE** BR §16.11, `notes`, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`. |
| **Relaciones** | N:1 dos veces `bank_accounts`. **Sin** FK a ventas/cobranzas. |

---

### 2.16 reconciliations

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Sesión/header de conciliación (BR §8). |
| **Campos** | `id`, `organization_id`, `status` (`draft` \| `closed` \| `voided` **PENDIENTE** anulación compensatoria BR §16.8), `closed_at`, `notes`, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`, `closed_by_user_id`. |

---

### 2.17 reconciliation_lines

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Línea N:M cobranza ↔ depósito (BR §8). |
| **Campos** | `id`, `organization_id`, `reconciliation_id`, `collection_id`, `bank_deposit_id`, `amount_applied_from_collection` **NUMERIC** (en moneda de la cobranza o en moneda común de línea — **PENDIENTE** política BR §16.4), `amount_applied_to_deposit` **NUMERIC** (en moneda del depósito), `fx_rate_reconciliation` **NUMERIC NULL** (obligatorio si monedas distintas cuando se permita cruce), `created_at`, `updated_at`, `deleted_at`. |
| **Invariantes** | Suma por `collection_id` no excede saldo conciliable de cobranza; suma por `bank_deposit_id` no excede monto depósito (BR §6.5 “faltante” prohibido). |

---

### 2.18 reconciliation_discrepancies (diferencias categorizadas)

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Diferencias con **categoría** obligatoria al cerrar (BR §8.5); no filas “sin tipo”. |
| **Campos** | `id`, `organization_id`, `reconciliation_id`, `reconciliation_line_id` **NULLABLE** (si aplica a línea o a sesión), `category_code` **PENDIENTE** FK a `reconciliation_discrepancy_categories`, `amount` **NUMERIC**, `currency_code`, `notes`, `created_at`. |

Catálogo `reconciliation_discrepancy_categories`: seed **PENDIENTE** (BR §6.5).

---

### 2.19 alerts

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Alertas derivadas (BR §11). |
| **Campos** | `id`, `organization_id`, `type` (enum string acotado), `severity`, `entity_type`, `entity_id` (UUID/texto polimórfico), `status` (`open` \| `acknowledged` \| `closed`), `created_at`, `acknowledged_at`, `closed_at`, `payload` JSONB opcional (contexto mínimo). |

---

### 2.20 audit_logs

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Auditoría append-only (BR §15, `ARCHITECTURE` §17). |
| **Campos** | `id`, `organization_id` **NULLABLE** (eventos globales **PENDIENTE**), `actor_user_id`, `action` (string estable), `entity_type`, `entity_id` **NULLABLE**, `occurred_at`, `payload` JSONB (diff/snapshot acotado), `ip_address` **NULLABLE**, `user_agent` **NULLABLE**. |
| **Sin** `deleted_at`. |

---

### 2.21 files

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Metadatos de objeto en R2; acceso controlado (BR §17.3, `ARCHITECTURE` §13). |
| **Campos** | `id`, `organization_id`, `storage_key` **UNIQUE** (opaco), `original_filename`, `mime_type`, `size_bytes`, `sha256` opcional, `linked_entity_type` (enum/string controlado), `linked_entity_id` (UUID), `uploaded_by_user_id`, `created_at`, `deleted_at`. |
| **Relaciones** | Polimórfico lógico; no FK polimórfico nativo en SQL — integridad por aplicación + índices por `(linked_entity_type, linked_entity_id)`. |

---

### 2.22 report_definitions

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Definición de reporte (BR §17.2). |
| **Campos** | `id`, `organization_id`, `code` **UNIQUE dentro de org** (slug), `name`, `report_type` enum/string **PENDIENTE** catálogo, `required_permission_definition_id` **NULLABLE** FK, `default_parameters` JSONB **PENDIENTE** esquema, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`. |

---

### 2.23 report_schedules

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Programación (cron, zona) (BR §17.2). |
| **Campos** | `id`, `organization_id`, `report_definition_id`, `cron_expression`, `timezone`, `is_active`, `saved_filter_id` **NULLABLE** FK futuro a `report_saved_filters` **PENDIENTE**, `parameters_override` JSONB **PENDIENTE**, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`. |

---

### 2.24 report_recipients

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Destinatarios de envíos (BR §17.2). |
| **Campos** | `id`, `organization_id`, `report_schedule_id`, `email` (validado), `name` opcional, `created_at`, `deleted_at`. |

---

### 2.25 report_runs

| Aspecto | Definición |
|---------|------------|
| **Propósito** | Ejecución concreta de reporte/export (historial, idempotencia jobs). |
| **Campos** | `id`, `organization_id`, `report_definition_id`, `report_schedule_id` **NULLABLE** (ejecución manual), `status` (`pending` \| `running` \| `success` \| `failed`), `started_at`, `finished_at`, `error_message`, `output_file_id` **NULLABLE** FK `files`, `triggered_by_user_id` **NULLABLE**, `idempotency_key` **NULLABLE UNIQUE** por org **PENDIENTE** política. |

---

## 3. Relaciones (resumen explícito)

| Par | Cardinalidad | Tabla puente / nota |
|-----|--------------|---------------------|
| `organizations` → `users` | N:M | `memberships` |
| `sales` → `collections` | N:M | `collection_allocations` |
| `collections` → `bank_deposits` | N:M | `reconciliation_lines` dentro de `reconciliations` |
| `sales` → `bank_deposits` | **Ninguna** directa | Solo indirecta vía cobranzas + conciliación (BR §2) |
| `bank_accounts` → `bank_transfers` | 1:N dos roles | `from_` / `to_` |
| `clients` → `sales` | 1:N | |
| `clients` → `client_contacts` | 1:N | |
| `collections` → `collection_fees` | 1:N | |
| `reconciliations` → `reconciliation_lines` | 1:N | |
| `report_definitions` → `report_schedules` | 1:N | |
| `report_schedules` → `report_recipients` | 1:N | |
| `report_definitions` → `report_runs` | 1:N | |

**Restricciones de negocio** no siempre expresables como FK: saldos de imputación/conciliación (BR §5, §6, §8) — validar en **transacción** al crear/cerrar.

---

## 4. Campos estándar y específicos

### 4.1 Estándar recomendado

- `id`: UUID (preferido) en todas las tablas tenant.  
- `organization_id`: obligatorio en entidades de negocio (§2).  
- `created_at`, `updated_at`: `timestamptz`.  
- `deleted_at`: `timestamptz NULL` donde aplique soft delete (§11).  
- `created_by_user_id` / `updated_by_user_id`: donde el proceso lo requiera (auditoría operativa complementaria a `audit_logs`).

### 4.2 Específicos

Ver §2 por entidad; no repetir aquí salvo aclaración: enums deben alinearse a `BUSINESS_RULES` sin contradicción (nombres internos documentados en migración).

---

## 5. Modelado de dinero

| Tema | Regla |
|------|--------|
| **Tipo SQL** | `NUMERIC(p, s)` con precisión/escala **PENDIENTE** fijar (p. ej. (18,4)) según política contable. |
| **Moneda** | `currency_code` `CHAR(3)` o enum restringido a `ARS`, `USD` en MVP. |
| **Equivalente ARS** | Columnas `amount_ars_equivalent_*` opcionales donde BR exija snapshot para KPIs históricos (ventas, cobranzas, depósitos). |
| **FX** | Columnas explícitas: `fx_rate_ars_per_unit_usd_at_*` o tasa a moneda de venta en `collection_allocations` / `reconciliation_lines` según BR §10. |
| **Dónde vive cada FX** | Ver §2 entidades; no recalcular histórico con tasa “hoy” salvo reporte explícito **PENDIENTE** fuera de MVP (BR §10.4). |

---

## 6. Modelado de conciliación

| Aspecto | Modelo |
|---------|--------|
| **Parcial / total** | Derivado: comparar `SUM(reconciliation_lines.amount_applied_to_deposit)` vs `bank_deposits.amount` y análogo en cobranza según moneda de trabajo de línea (BR §6.4, §8.3). |
| **Sesión** | `reconciliations` + `reconciliation_lines`; cierre pasa `status` a `closed` y fija `closed_at`. |
| **Diferencias** | `reconciliation_discrepancies` con categoría obligatoria al cerrar (BR §8.5). |
| **Saldos pendientes** | **Materializado por consulta:** `gross_amount - SUM(allocations)` para imputación a ventas; `gross_amount - SUM(lines collection side)` para cobranza conciliable; depósito análogo — **PENDIENTE** nombres de columnas cache opcionales para performance. |
| **Moneda cruzada** | **PENDIENTE** BR §16.4: hasta definirse, restricción en aplicación: solo líneas con misma moneda o exigir tasas en línea y validar doble entrada. |

---

## 7. Permisos (data model) — resolución

1. **Lectura:** sesión Auth.js → `user` (tabla `users`) → `membership` activo para `organization_id` → `role_id`.  
2. Si `owner` → permitir todo (BR §12.3).  
3. Si no → `organization_role_enabled_modules.is_enabled` y `organization_role_permissions.is_allowed` para la `permission_definition` requerida por la operación.  
4. **Escritura:** misma evaluación en servidor antes de mutar.

**Catálogos** `app_modules` y `permission_definitions` se versionan con seeds en repo; matriz por org en `organization_role_*`.

---

## 8. Archivos

| Elemento | Definición |
|----------|------------|
| **Tabla** | `files` (§2.21). |
| **Vínculo** | `linked_entity_type` + `linked_entity_id` (polimórfico). |
| **R2** | `storage_key` único; path lógico sugerido: `{env}/{organization_id}/{entity_type}/{file_id}-{safe_name}` **PENDIENTE** convención final. |
| **Seguridad** | Sin lectura pública; descarga solo con **URL firmada** corta generada tras chequeo de permisos y pertenencia a org (BR §17.3). |

---

## 9. Reportes y jobs

| Entidad | Uso |
|---------|-----|
| `report_definitions` | Qué se puede ejecutar y bajo qué permiso. |
| `report_schedules` | Cuándo y con qué parámetros/filtros. |
| `report_recipients` | A quién enviar. |
| `report_runs` | Traza de ejecución, errores, archivo resultado (`files`). |

**Jobs genéricos** fuera de reportes: **PENDIENTE** tabla `job_runs` global o reutilizar `report_runs` solo para reportes — no asumir; si se introduce `job_runs`, no duplicar semántica con `report_runs`.

---

## 10. Índices y constraints (conceptual)

| Ítem | Descripción |
|------|-------------|
| **Unicidad tenant** | `clients.tax_id` **PENDIENTE** único por org si aplica; `sales.invoice_number` **PENDIENTE** único por org si se usa numeración. |
| **Owner único** | **UNIQUE** parcial o constraint: exactamente una membresía `role=owner` activa por `organization_id`. |
| **Auth / usuarios** | **UNIQUE** `users.email`; **UNIQUE** `accounts(provider, provider_account_id)` (OAuth). |
| **Membership** | **UNIQUE** `(organization_id, user_id)` filas activas. |
| **Imputación** | Índice `(collection_id)` y `(sale_id)` en `collection_allocations`. |
| **Conciliación** | Índice `(collection_id)`, `(bank_deposit_id)`, `(reconciliation_id)` en `reconciliation_lines`. |
| **Consultas** | Índices por `(organization_id, deleted_at, fecha_*)` en listados filtrables (ventas, cobranzas, depósitos). |
| **FK compuesta org** | **PENDIENTE** si se implementan FKs compuestos `(id, organization_id)` para prevenir fuga cross-tenant a nivel DB; mínimo obligatorio en capa aplicación. |

---

## 11. Soft delete

| Entidad | `deleted_at` |
|---------|--------------|
| **Sí (por defecto)** | `organizations` (opcional), `users`, `memberships`, `clients`, `client_contacts`, `sales`, `sale_lines`, `collections`, `collection_allocations`, `collection_fees`, `bank_accounts`, `bank_deposits`, `bank_transfers`, `reconciliations`, `reconciliation_lines`, `files`, `report_definitions`, `report_schedules`, `report_recipients` |
| **No** | `audit_logs`, catálogos globales (`roles`, `app_modules`, `permission_definitions`) |

**Queries:** filtro por defecto `deleted_at IS NULL` en UI operativa; reportes históricos opcionales con flag (BR §14.3).

---

## 12. Auditoría

| Campo | Uso |
|--------|-----|
| `actor_user_id` | Quién. |
| `organization_id` | Scope; NULL solo si evento sin tenant **PENDIENTE**. |
| `action` | Código estable (`sale.updated`, `permission.matrix.updated`, … catálogo **PENDIENTE**). |
| `entity_type` / `entity_id` | Sobre qué registro. |
| `payload` | Diff o snapshot JSON acotado (BR §15.2). |
| `occurred_at` | Cuándo. |

**Visibilidad:** BR §15.3 — no modelado en tablas adicionales en MVP salvo **PENDIENTE** `audit_log_view_grants`.

---

## 13. Decisiones abiertas / pendientes (consolidado)

Deben resolverse antes o durante primera migración Prisma:

1. Convención de enums `sales.status` (idioma/códigos).  
2. `sale_lines` vs solo header: política MVP única (BR §16.13).  
3. `sales.overdue` persistido vs calculado.  
4. Tolerancia numérica global y tipo `NUMERIC` precisión.  
5. Catálogo `payment_method` y reglas de adjuntos (BR §16.2).  
6. Política conciliación cruzada moneda y columnas obligatorias de tasa (BR §16.4).  
7. Modelo compensatorio anulación cobranza ya conciliada (BR §16.8).  
8. Lista cerrada `app_modules` + `action_code` + seeds iniciales (BR §16.10).  
9. Owner: grants materializados vs bypass sin filas.  
10. `client_id` NOT NULL en `sales` (BR §16.12).  
11. `report_saved_filters` y esquema JSON de parámetros.  
12. `job_runs` genérico vs solo `report_runs`.  
13. FK compuesto anti cross-tenant en Postgres vs solo aplicación.  
14. Transferencias con comisión explícita (BR §16.11).  

---

## 14. Alineación explícita con BUSINESS_RULES

- Venta ↔ cobranza: **N:M** vía `collection_allocations`; venta 1:N cobranzas a nivel conceptual = muchas cobranzas apuntan a la misma venta vía líneas.  
- Cobranza ↔ depósito: **N:M** vía `reconciliation_lines`.  
- Transferencias: sin FK a ventas/cobranzas.  
- Diferencias conciliación: categorizadas; tabla dedicada.  
- Permisos: matriz en `organization_role_enabled_modules` + `organization_role_permissions` + catálogos; evaluación backend (BR §12).  
- Archivos: metadata + R2 + URLs firmadas (BR §17.3).  
- Reportes programados: entidades §2.22–2.25 (BR §17.2).

---

**Fin del documento.**
