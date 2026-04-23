# Skill — permisos y seguridad (tracmer-app)

## Cuándo usarla

AuthZ, roles, matriz de módulos, acciones, middleware, Server Actions, APIs, descarga de archivos, datos sensibles entre tenants.

## Qué priorizar

- `docs/product/BUSINESS_RULES.md` §12 + `docs/architecture/ERD_AND_DATA_MODEL.md` §2.5, §7 + `ARCHITECTURE.md` §7.  
- **Clerk** = autenticación (sesión/identidad). **App (Postgres)** = membresía, rol, **matriz persistida** (módulo habilitado + permiso por acción).  
- **Un solo `owner`** por organización.  
- **Evaluación en backend** en cada lectura/mutación sensible; la UI solo oculta por UX.  
- **Aislamiento de tenant:** no aceptar `organization_id` arbitrario sin verificar membresía.  
- **Archivos:** sin acceso público anónimo; **URL firmada** corta tras chequear permiso y vínculo a entidad (BR §17.3).

## Errores a evitar

- Resolver permisos de negocio en Clerk o solo en el frontend.  
- Checks hardcodeados dispersos en lugar de leer la matriz (o proyección cacheada invalidable de la misma fuente).  
- Exponer URLs R2 largas sin autorización.  
- Asumir rol desde el cliente.
