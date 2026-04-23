# Skill — datos y backend (tracmer-app)

## Cuándo usarla

Schema Prisma/migraciones, queries, transacciones, invariantes financieros, soft delete, auditoría, jobs que toquen datos, o refactor de repositorios/servicios.

## Qué priorizar

- `docs/architecture/ERD_AND_DATA_MODEL.md` + `docs/product/BUSINESS_RULES.md` + `docs/architecture/ARCHITECTURE.md` §5, §12.  
- **Multi-tenant:** `organization_id` en filas de negocio; filtros siempre en servidor.  
- **Postgres + Prisma** según repo; montos en **`NUMERIC`** (no float).  
- **Soft delete** (`deleted_at`) en entidades sensibles; **no** en `audit_logs`.  
- **FX persistido** en columnas indicadas en ERD/BR; no recalcular silenciosamente histórico.  
- **N:M:** `collection_allocations` (venta↔cobranza), `reconciliation_lines` (cobranza↔depósito); no atajos con FK directa venta→depósito.  
- **Transacciones** al mutar imputaciones, cobranzas, cierre de conciliación, estados de venta.  
- **Auditoría** para acciones sensibles listadas en BR §15.

## Errores a evitar

- Hard delete de ventas/cobranzas/conciliaciones/archivos/report runs.  
- Float para dinero.  
- Queries sin `organization_id`.  
- Romper sumas (imputaciones > bruto cobranza; líneas de conciliación que excedan depósito/cobranza).  
- Duplicar reglas de negocio ya definidas en BR (leer antes de codificar).
