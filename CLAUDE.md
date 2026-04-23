# Guía para agentes — tracmer-app

Este repo es **tracmer-app**: control **administrativo-financiero** (ventas facturadas, cobranzas, bancos, conciliación, reportes, alertas, auditoría). **No es un TMS.** La fuente de verdad resumida está en `docs/ai/AI_CONTEXT.md`; el detalle normativo en `docs/architecture/ARCHITECTURE.md`, `docs/product/BUSINESS_RULES.md` y `docs/architecture/ERD_AND_DATA_MODEL.md`. Skills por tema: `docs/ai/skills/`.

---

## 1. Cómo empezar cada tarea

1. Leé los docs que apliquen (al menos `AI_CONTEXT.md`; si tocás datos o reglas, `BUSINESS_RULES.md` + `ERD_AND_DATA_MODEL.md`; si tocás capas/stack, `ARCHITECTURE.md`).  
2. Clasificá la tarea: **UI**, **dominio/aplicación**, **datos/Prisma**, **permisos/seguridad**, **infra** (email, R2, jobs).  
3. Implementá solo en el layer correcto (ver `ARCHITECTURE.md` §5).

---

## 2. Límites del producto

- **No TMS** ni logística de ejecución.  
- **No** features fuera del MVP salvo pedido explícito de producto.  
- **No i18n** en MVP: UI y emails en **español (Argentina)**.

---

## 3. Reglas de implementación

- **Backend-first** para permisos, tenant, estados de venta, imputaciones, conciliación y montos.  
- **No duplicar** patrones: reutilizá `packages/ui`, `packages/validators`, `packages/database`, etc., según exista en el repo.  
- **Cambios pequeños**; sin refactors masivos no solicitados.  
- **No tocar** módulos no relacionados con el pedido.

---

## 4. Reglas de datos

- **Multi-tenant:** `organization_id` en entidades de negocio; nunca confiar solo en el cliente para el tenant activo.  
- **No hard delete** por defecto en lo sensible; `deleted_at` / estados (BR §14, ERD).  
- **Dinero:** `NUMERIC`/decimal exacto; no float.  
- **FX persistido** en columnas/eventos según BR §10 y ERD; no recalcular histórico con “tasa de hoy” salvo decisión explícita PENDIENTE cerrada.  
- **N:M:** venta↔cobranza solo vía **`collection_allocations`**; cobranza↔depósito solo vía **`reconciliation_lines`**. No inventar atajos que rompan eso.

---

## 5. Reglas de UI

- **shadcn/ui** + Tailwind; **shell** inspirado en **Efferd** (sidebar + topbar).  
- **Light y dark** desde el inicio con **tokens** centralizados.  
- **No** crear variantes arbitrarias por pantalla: tablas, formularios, filtros y confirmaciones salen del sistema reutilizable.

---

## 6. Reglas de permisos

- **Clerk** autentica; la **app** autoriza (membresía + matriz: módulos habilitados por rol + acciones por módulo, persistido — ver ERD §2.5).  
- **Un solo `owner`** por organización.  
- La evaluación efectiva de permisos es en **servidor** en cada operación sensible.

---

## 7. Si algo está pendiente en los docs

- **No inventar** reglas de negocio ni de datos.  
- Marcá **PENDIENTE** o pedí decisión de producto.  
- Si hace falta avanzar: elegí la **opción mínima segura** (menos supuestos, menos superficie) y documentala en una línea.

---

## 8. Forma de entrega

- Explicá brevemente **qué** cambió y **por qué**.  
- Listá **archivos tocados**.  
- No expandas el alcance.  
- Si hay **contradicción entre documentos**, no asumas: indicá el conflicto y pedí alineación antes de codificar lo dudoso.
