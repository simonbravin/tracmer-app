# AI context — tracmer-app

**Versión:** 1.0  
**Uso:** fuente central de contexto para IAs (Cursor, Claude, etc.).  
**Normativo (no contradecir):** `docs/architecture/ARCHITECTURE.md`, `docs/product/BUSINESS_RULES.md`, `docs/architecture/ERD_AND_DATA_MODEL.md`.

Si algo no está en esos documentos → **PENDIENTE**; no inventar.

---

## 1. Product summary

**tracmer-app** es una plataforma **administrativo-financiera** para empresas de transporte: centraliza clientes, ventas facturadas, cobranzas, cuentas bancarias, depósitos, transferencias internas, conciliación cobranzas↔depósitos, tablero/reportes, exportes, reportes programados por email, alertas y auditoría.

**Problema que resuelve:** controlar la cadena **facturado → cobrado → depositado → conciliado**, con monedas/FX explícitos, trazabilidad y permisos.

**Qué NO es:** **no es un TMS** ni debe incluir rutas, flota, dispatch, GPS, ejecución logística, ni i18n en MVP (ver `ARCHITECTURE.md` / `BUSINESS_RULES.md`).

---

## 2. Scope

**Incluye (MVP):** auth (Auth.js: Google + correo/contraseña, reset), equipo/invitaciones, clientes y contactos, ventas y estados, cobranzas e imputaciones, bancos (cuentas, depósitos, transferencias), conciliación, alertas, auditoría, tablero y reportes con filtros, exportes (PDF/Excel/CSV según producto), reportes programados (definición + schedule + destinatarios + runs), archivos (R2), roles base y matriz de permisos.

**No incluye (MVP):** integraciones bancarias/API, ARCA, facturación electrónica externa, app móvil nativa, multi-idioma, TMS u operación logística.

---

## 3. Core domain concepts (resumen)

| Concepto | Definición corta |
|----------|------------------|
| **Venta** | Operación **facturada**; total a cobrar, moneda, fecha factura, días de crédito, estado de ciclo de vida (BR §1, §3). |
| **Cobranza** | Dinero/value **recibido**; bruto, neto (tras gastos explícitos), imputación a ventas (BR §5). |
| **Depósito** | Dinero **ingresado al banco** en una cuenta; sin FK directa a ventas (BR §6). |
| **Transferencia** | Movimiento **entre cuentas propias**; no toca ventas ni cobranzas (BR §7). |
| **Conciliación** | Asignación **trazada** entre porciones de cobranzas y porciones de depósitos; puede ser parcial/total; diferencias categorizadas al cerrar (BR §8). |

---

## 4. Key relationships

- **Venta ↔ cobranza:** **N:M** vía **`collection_allocations`** (múltiples cobranzas por venta; una cobranza puede repartirse entre varias ventas; suma imputada ≤ bruto de cobranza, BR §2).  
- **Cobranza ↔ depósito:** **N:M** vía **`reconciliation_lines`** bajo **`reconciliations`** (BR §2, §8).  
- **Transferencias:** separadas; **sin** relación directa con ventas/cobranzas (BR §7).  
- **Venta ↔ depósito:** **sin** relación directa; solo indirecta (venta → cobranza → conciliación → depósito).

---

## 5. Currency and FX

- **Moneda base:** ARS. **Permitidas en MVP:** ARS y USD (`BUSINESS_RULES` convenciones).  
- **FX:** siempre **persistido** en columnas/registros según BR §10 y ERD §5 (emisión, imputación, depósito, líneas de conciliación si aplica).  
- **No** usar solo formato UI para conversiones que impacten KPIs o saldos.  
- **No** recalcular histórico con “tasa de hoy” salvo reporte explícito **PENDIENTE** fuera de MVP (BR §10.4).

---

## 6. Multi-tenant

- Datos de negocio con **`organization_id`** (o herencia clara desde padre con org).  
- Queries/mutaciones: **siempre** scoped en **backend**; no confiar en `organization_id` enviado solo desde el cliente.  
- **Exactamente un `owner` por organización** (BR §12.3, ERD constraints).

---

## 7. Roles y permisos

- Roles base: **`owner`**, **`admin`**, **`operativo`** (`roles` catálogo).  
- **`owner`:** puede todo en su org; gestiona matriz y equipo; invariante de unicidad.  
- **Otros:** solo lo permitido por **matriz persistida**: módulos habilitados por rol + permisos por **módulo + acción** (`app_modules`, `permission_definitions`, `organization_role_enabled_modules`, `organization_role_permissions` — ver ERD §2.5).  
- **Evaluación real en backend**; UI solo ayuda UX (BR §12.2).

---

## 8. UI rules

- **shadcn/ui** + Tailwind; tokens centralizados; **light y dark** desde el inicio.  
- **Shell** tipo **Efferd** (sidebar + topbar), layouts anidados (`ARCHITECTURE.md` §9).  
- **Reutilización obligatoria:** tablas, formularios, filtros, modales/confirmaciones desde el sistema compartido (`packages/ui`); **prohibido** duplicar patrones arbitrarios por pantalla (BR §17.4).  
- Copy UI en **español (Argentina)**; sin i18n en MVP.

---

## 9. Architecture summary

- **Next.js** (App Router), **React**, **TypeScript**, **Tailwind**.  
- **Postgres** (Neon) + **Prisma**; capas: UI → actions delgados → servicios → dominio → repos/Prisma → infra (Resend, R2, Auth.js) (`ARCHITECTURE.md` §5).  
- **Auth.js:** autenticación; app: membresías y permisos.  
- **R2:** archivos; metadata en `files`; acceso por **URL firmada** corta desde backend (BR §17.3).  
- **Resend:** email (invitaciones complementarias, reportes, exportes).  
- **Vercel:** deploy; jobs/cron evolutivos (`ARCHITECTURE.md` §16).  
- **Validación:** Zod compartido cliente/servidor (`ARCHITECTURE.md` §11).

---

## 10. Data model summary (alto nivel)

No sustituye el ERD; solo ancla nombres:

| Área | Entidades |
|------|-----------|
| Tenant / auth app | `organizations`, `users`, `accounts`, `memberships`, `roles` |
| Permisos | `app_modules`, `permission_definitions`, `organization_role_enabled_modules`, `organization_role_permissions` |
| CRM | `clients`, `client_contacts` |
| Operación | `sales`, `sale_lines` (evolutivo / política MVP **PENDIENTE**), `collections`, `collection_allocations`, `collection_fees` |
| Bancos | `bank_accounts`, `bank_deposits`, `bank_transfers` |
| Conciliación | `reconciliations`, `reconciliation_lines`, `reconciliation_discrepancies` |
| Transversal | `alerts`, `audit_logs`, `files` |
| Reportes | `report_definitions`, `report_schedules`, `report_recipients`, `report_runs` |

Relaciones pivot críticas: **`collection_allocations`**, **`reconciliation_lines`** (ERD §3).

---

## 11. Critical rules (no romper)

1. **No duplicar** lógica de negocio, permisos, FX ni validaciones sensibles.  
2. **No** confiar en el frontend para permisos, tenant o invariantes financieras.  
3. **No** agregar features tipo **TMS** ni ampliar alcance fuera de MVP sin producto explícito.  
4. **No** hard-delete por defecto en entidades sensibles; **soft delete** + estados (BR §14, ERD §11).  
5. **No** ignorar **`organization_id`** en lecturas/escrituras.  
6. **No inventar** reglas de negocio: si no está en BR/ERD → **PENDIENTE** y pedir cierre o doc.  
7. **Montos:** tipo decimal exacto en DB (`NUMERIC`), no float (BR convenciones / ERD §5).

---

## 12. Development rules for AI

1. **Leer** este archivo y, según la tarea, `BUSINESS_RULES.md` / `ERD_AND_DATA_MODEL.md` / `ARCHITECTURE.md` **antes** de implementar.  
2. **Cambios pequeños** y revisables; no refactors masivos no pedidos.  
3. **No tocar** módulos/archivos no relacionados con el pedido.  
4. **Reutilizar** patrones y paquetes existentes antes de crear nuevos.  
5. Si hace falta asumir algo no cerrado: **documentar** el supuesto en PR o comentario mínimo y marcarlo **PENDIENTE** para producto.

---

## 13. Open decisions (consolidado)

Tomado de `BUSINESS_RULES.md` §16 y `ERD_AND_DATA_MODEL.md` §13 (lista no exhaustiva para implementación):

- Fórmula **margen / “para depositar”** (BR §9.1).  
- Catálogo **medios de cobro** y documentación obligatoria (N archivos) (BR §11, §16.2).  
- **D** días alerta “cobranza no depositada” (BR §11).  
- **Conciliación en distinta moneda** y tasas por línea vs sesión (BR §8.4, §16.4).  
- **Tolerancia de redondeo** global y precisión `NUMERIC` (BR §16.5).  
- **días_credito = 0** mismo día vs día siguiente (BR §4).  
- **Anular cobranza** ya conciliada: modelo compensatorio (BR §16.8).  
- **Cancelar venta cobrada** / **reapertura cancelada** (BR §16.7).  
- **Desvío FX:** tasa referencia y umbral (BR §16.9).  
- Lista cerrada **módulos y acciones** en matriz (BR §16.10).  
- **Cliente obligatorio** en ventas o no (BR §16.12).  
- **`sale_lines` vs solo total en header** en MVP (BR §16.13, ERD §2.9).  
- Estado **`overdue`** persistido vs calculado (ERD §2.8).  
- **`report_saved_filters`**, `job_runs` genérico vs solo `report_runs` (ERD §9, §13).  
- FK compuesto anti cross-tenant en DB vs solo aplicación (ERD §10).  
- Estrategia **owner**: bypass sin filas vs grants materializados (ERD §2.5, §13).  
- Bootstrap de **usuario ↔ org** tras login detallado en layout `(app)` y `ARCHITECTURE.md` §6–7.

---

**Fin.** Para detalle ejecutable usar siempre los tres documentos normativos enlazados arriba.
