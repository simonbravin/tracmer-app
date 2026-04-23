# Reglas de negocio — tracmer-app

**Versión:** 1.0  
**Alcance:** plataforma administrativo-financiera (no TMS).  
**Fuentes normativas:** `docs/ai/AI_CONTEXT.md`, `docs/architecture/ARCHITECTURE.md`, este documento.

Este documento define reglas de negocio **determinísticas**. Donde algo no esté cerrado, se marca como **pendiente** en la sección 16 — no se improvisa en implementación.

**Convenciones:**

- **Moneda base:** ARS.  
- **Monedas permitidas (MVP):** ARS y USD.  
- **Fecha actual:** fecha calendario de la zona horaria configurada para la organización (por defecto **América/Argentina/Buenos_Aires** salvo que se documente otra).  
- **Comparaciones de fecha:** solo fecha (sin hora) salvo que la entidad defina explícitamente datetime operativo.  
- Todo monto monetario se almacena como **decimal exacto** (tipo SQL `numeric`), nunca float.

---

## 1. Definición de conceptos clave

### 1.1 Venta

**Venta** es un registro de **operación facturada** de la organización: representa **lo que se facturó** a un cliente, con importe(s), moneda, fecha de factura, identificación fiscal/comercial mínima necesaria para el control administrativo, y condición de crédito en días.

- Una venta **no** modela ejecución logística (viajes, rutas, unidades).  
- Una venta puede estar asociada a un **cliente** (obligatorio salvo regla explícita futura de “cliente genérico”, hoy **no definida** — ver §16).

### 1.2 Cobranza

**Cobranza** es un registro de **dinero o valor recibido** que se imputa a una o más ventas. Es el puente entre **facturado** y **liquido disponible para banco**.

- Una cobranza tiene **importe bruto** en su moneda de registro.  
- Puede existir **más de una cobranza** por la misma venta (cobranzas parciales).  
- Una misma cobranza **no** puede imputarse por más del 100 % de su importe bruto entre ventas (la suma de imputaciones ≤ importe bruto).

### 1.3 Depósito

**Depósito** es un registro de **dinero ingresado efectivamente** en una **cuenta bancaria** de la organización (movimiento bancario real), con fecha de depósito, cuenta destino, importe y moneda del movimiento bancario.

- El depósito es **independiente** de la venta: se relaciona con ventas **solo a través** de cobranzas y de la **conciliación**.

### 1.4 Transferencia

**Transferencia** es un movimiento **entre cuentas bancarias propias** de la misma organización (salida en cuenta A, entrada en cuenta B), misma magnitud económica neta para la organización (salvo comisiones bancarias explícitas modeladas aparte si se agregan en el futuro).

- Las transferencias **no** imputan ventas y **no** modifican “cobrado” ni “pendiente de cobro”.

### 1.5 Conciliación

**Conciliación** es el acto registrado de **asignar** partes de una o más **cobranzas** a uno o más **depósitos** (y viceversa), de modo que quede trazabilidad de **qué cobro alimentó qué depósito** y en qué importe.

- La conciliación puede ser **parcial** o **total** respecto de cada cobranza y cada depósito.  
- Las diferencias (comisiones, redondeos, FX, timing) se expresan como **diferencia documentada** vinculada a la conciliación o a sus líneas (detalle de implementación en ERD; el negocio exige que **no queden diferencias sin categoría** una vez cerrada una sesión de conciliación — ver §8).

### 1.6 Alerta

**Alerta** es un ítem **derivado** del estado del sistema y de reglas configurables: se genera o resuelve automáticamente según datos y umbrales; puede requerir **reconocimiento** humano según tipo.

- Una alerta **no** sustituye auditoría ni permisos.

### 1.7 Estado de venta

**Estado de venta** es un campo de ciclo de vida **controlado** de la venta. Los valores permitidos están listados en §3. El estado se **recalcula** o **transiciona** según reglas explícitas; no es un label libre.

---

## 2. Relación entre entidades

| Relación | Regla |
|----------|--------|
| Venta → Cobranzas | **1:N.** Una venta puede tener cero, una o muchas cobranzas. |
| Cobranza → Ventas | **N:M vía imputación** con restricción: cada cobranza reparte a lo sumo su importe bruto entre líneas de imputación. |
| Cobranza → Depósitos | **N:M solo vía conciliación** (líneas de conciliación que enlazan porción de cobranza con porción de depósito). |
| Depósito → Cobranzas | **N:M** por la misma vía. No se asume relación directa venta–depósito. |
| Transferencia → Venta / Cobranza | **Ninguna.** No afecta ventas ni cobranzas directamente. |
| Cliente → Ventas | **1:N** típico. |

**Invariante global:** toda entidad de negocio persistida lleva `organization_id` (o hereda de padre que lo lleva) y todas las consultas/mutaciones aplican aislamiento por organización en backend.

---

## 3. Estados de venta

### 3.1 Catálogo de estados

| Estado | Significado |
|--------|-------------|
| `borrador` | Registro incompleto o no válido para KPIs operativos; no exige numeración fiscal final. |
| `emitida` | Venta válida operativamente; pendiente de cobro total (cobrado acumulado = 0). |
| `parcialmente_cobrada` | Emitida; cobrado acumulado > 0 y < total a cobrar de la venta. |
| `cobrada` | Cobrado acumulado = total a cobrar de la venta (tolerancia de redondeo ver §12). |
| `vencida` | Criterio de vencimiento (§4) cumplido y **no** `cobrada`. |
| `cancelada` | Anulación administrativa; **no** participa en KPIs de operación salvo reportes de histórico/anulaciones. |

**Prioridad de visualización:** si una venta **no** está `cancelada` ni `borrador`, cumple vencimiento (§4) y no está cobrada, su estado operativo es `vencida` aunque antes fuera `emitida` o `parcialmente_cobrada`. Es decir, **vencida sobreescribe** esos estados para fines de listados y alertas. `cancelada` **nunca** se trata como `vencida`.

### 3.2 Definiciones auxiliares para transiciones

- **Total a cobrar de la venta:** importe pendiente de facturación **no** aplica aquí: la venta ya está emitida o en borrador. Para ventas `emitida`, `parcialmente_cobrada`, `vencida`, `cobrada`:  
  - **Total a cobrar** = suma de importes **en moneda de la venta** según el contrato de la venta (ver §9 y §10). En MVP se asume **un solo importe total de venta** en `moneda_venta` salvo que el producto defina multi-línea con totales; si existen líneas, **total a cobrar** = suma de líneas expresadas en moneda de la venta según reglas de conversión vigentes al emitir.  
- **Cobrado acumulado (venta):** suma de importes **imputados a la venta** desde cobranzas **válidas** (§5), convertidos a moneda de la venta con la **tasa de imputación** registrada en cada línea de imputación (§10).

### 3.3 Transiciones permitidas

| Desde | Hacia | Disparador |
|-------|--------|------------|
| `borrador` | `emitida` | Usuario con permiso `ventas:emitir` (o acción equivalente en matriz) confirma emisión; validaciones mínimas cumplidas. |
| `borrador` | `cancelada` | Cancelación desde borrador. |
| `emitida` | `parcialmente_cobrada` | Primera cobranza válida imputa importe > 0 y < total a cobrar. |
| `emitida` | `cobrada` | Cobranzas válidas imputan 100 % del total a cobrar. |
| `parcialmente_cobrada` | `cobrada` | Igual. |
| `emitida` / `parcialmente_cobrada` / `cobrada` | `vencida` | Regla §4 (automática en recálculo; no requiere acción humana). |
| `vencida` | `parcialmente_cobrada` / `cobrada` | Al cobrar lo suficiente deja de cumplirse “no cobrada completamente”; el estado deja de ser `vencida` y pasa al estado de cobro correspondiente. |
| `emitida` / `parcialmente_cobrada` / `vencida` | `cancelada` | Solo roles con permiso explícito `ventas:anular` (nombre exacto en matriz); **owner** siempre puede (§12). |
| `cobrada` | `cancelada` | **Prohibido por defecto** salvo política explícita “reversión con nota de crédito” **pendiente** (§16). |
| `cancelada` | cualquier otro | **Prohibido** salvo proceso documentado de “reapertura” **pendiente** (§16). |

**Recálculo:** los estados `vencida`, `parcialmente_cobrada`, `cobrada` se recalculan tras eventos: emisión, imputación de cobranza, anulación de cobranza, cambio de `fecha_factura` o `dias_credito` si se permitiera editar — edición posterior está restringida (§13).

---

## 4. Regla de vencimiento

Una venta en estado distinto de `cancelada` y distinto de `borrador` se considera **vencida** si y solo si:

1. `fecha_factura` + `dias_credito` < **fecha_actual** (comparación solo fecha, zona horaria de la organización); **y**  
2. **no** está **completamente cobrada** (cobrado acumulado < total a cobrar, fuera de tolerancia de redondeo §12).

**Notas:**

- `dias_credito` = 0 implica vencimiento el día de la fecha de factura **posterior** al día de factura (es decir, desde el día calendario siguiente ya está vencida si no está cobrada). Ajuste fino “mismo día no vence” **pendiente** si producto lo exige (§16).  
- Ventas `cobrada` **nunca** `vencida`.

---

## 5. Cobranzas

### 5.1 Qué significa “cobrado”

**Cobrado** (respecto de una venta) es la suma de importes **imputados** desde cobranzas **válidas** a esa venta, expresada en la **moneda de la venta** usando la tasa registrada en cada imputación.

**Cobrado** (respecto de la organización en un periodo) sin contexto de venta se usa solo en reportes; debe aclararse la moneda de agregación (típicamente ARS equivalente con reglas del §10).

### 5.2 Importe bruto y neto

- **Importe bruto (cobranza):** monto total recibido declarado para esa cobranza en su `moneda_cobranza`.  
- **Gastos/comisiones de cobranza:** montos **no negativos** opcionales vinculados a la cobranza (ej. comisión de terminal, retención), en moneda definida por registro; deben estar **explícitos** para afectar neto.  
- **Importe neto (cobranza):**  

  `neto = bruto - sum(gastos_en_moneda_cobranza_convertidos)`  

  donde la conversión de cada gasto a `moneda_cobranza` usa **tasa de gasto** persistida en el registro del gasto.

Si no hay gastos, `neto = bruto`.

### 5.3 Impacto en estado de venta

Tras cada alta/baja/modificación de imputaciones de cobranzas **válidas**:

1. Recalcular cobrado acumulado de la venta.  
2. Aplicar transiciones §3.  
3. Recalcular condición de vencimiento §4.

### 5.4 Validez de una cobranza

Una cobranza es **válida** si:

- Pertenece a la organización;  
- `moneda_cobranza` ∈ { ARS, USD };  
- `bruto` > 0;  
- `fecha_cobranza` ≤ **fecha_actual** salvo política explícita “fecha futura permitida” **pendiente** (§16);  
- No está **anulada** ni **soft-deleted** (§14);  
- Suma de imputaciones a ventas ≤ `bruto` (tolerancia §12).

### 5.5 Cobranzas parciales

- **Parcial respecto de la venta:** varias cobranzas suman el total; cada una puede ser menor al total a cobrar.  
- **Parcial respecto del depósito:** una cobranza puede conciliarse en partes a varios depósitos (§8).

### 5.6 Anulación / reversión

- **Anular cobranza** (permiso explícito, auditoría obligatoria): deja de contar para cobrado y para conciliaciones pendientes; líneas de conciliación ya cerradas **no** se borran físicamente: se revierte vía **movimiento compensatorio** o **estado de conciliación** según ERD (**detalle pendiente** §16).  
- **Owner** puede anular según permisos base; otros roles según matriz.

---

## 6. Depósitos

### 6.1 Qué representa

Un **depósito** representa dinero **ya ingresado** en una cuenta bancaria de la organización (evento bancario real).

### 6.2 Moneda

- Cada depósito tiene exactamente **una** `moneda_deposito` ∈ { ARS, USD } alineada al **movimiento bancario** registrado.  
- No se mezclan monedas en un solo registro de depósito.

### 6.3 Relación con cobranzas

Solo por **conciliación** (líneas que asignan importe de cobranza a importe de depósito). No hay imputación directa venta → depósito.

### 6.4 Cuándo un depósito está “conciliado”

- **Parcialmente conciliado:** suma de importes conciliados (lado depósito) < `importe_deposito` (fuera de tolerancia).  
- **Totalmente conciliado:** igualdad con tolerancia §12 y **todas** las diferencias de la sesión tienen categoría (§8).

### 6.5 Sobrante o faltante

- **Sobrante en depósito:** el importe del depósito excede la suma conciliada desde cobranzas; genera **diferencia categorizada** (ej. “comisión bancaria no imputada a cobranza”, “ingreso no identificado”) **pendiente** de catálogo cerrado (§16) o queda como **pendiente de conciliar** hasta nueva cobranza o ajuste.  
- **Faltante:** suma conciliada > importe depósito **no** permitida; el sistema debe rechazar cierre que viole conservación de montos por línea.

---

## 7. Transferencias

- Representan **solo** movimiento entre cuentas propias.  
- **Efecto en saldos de banco:** incrementa disponibilidad en cuenta destino y decrementa en origen (más comisiones si se modelan).  
- **No** crean cobranzas, **no** cierran ventas, **no** entran en “total cobrado”.  
- Pueden generar **alertas** de saldo o de documentación si faltan comprobantes (**umbrales pendientes** §16).

---

## 8. Conciliación

### 8.1 Qué es

Una **conciliación** es un registro (o sesión) que agrupa **líneas**: cada línea indica **qué porción de qué cobranza** se asigna a **qué porción de qué depósito**, con posible **diferencia** explicada.

### 8.2 Funcionamiento

1. El usuario (con permiso) selecciona cobranzas y/o depósitos pendientes.  
2. Propone líneas de asignación hasta cuadrar según reglas.  
3. Al **cerrar** la conciliación, el sistema valida conservación (sumas por moneda) y obliga **categorías** para diferencias.  
4. Queda **auditoría** (§15).

### 8.3 Parcial vs total

- **Parcial:** alguna cobranza o depósito queda con saldo pendiente de conciliar después del cierre.  
- **Total:** para el conjunto involucrado en la sesión, no quedan remanentes sin explicación; o los remanentes quedan explícitamente en estado “pendiente” vinculado.

### 8.4 Reglas de asignación

- Solo se concilian cobranzas y depósitos de la **misma organización**.  
- Las líneas no pueden asignar más del **saldo pendiente de conciliar** de cada cobranza o depósito.  
- Conciliación **cruzada de moneda** (cobranza USD vs depósito ARS): solo permitida si el producto registra **tipo de cambio de conciliación** por línea o por sesión (**política exacta pendiente** §16); hasta definirse, el MVP puede **restringir** a mismo par de moneda o exigir conversión explícita en línea.

### 8.5 Diferencias permitidas

- Diferencias por comisión, redondeo, timing o FX deben ser **categorizadas** con montos explícitos; no se acepta diferencia “sin tipo”.  
- Magnitud máxima sin aprobación especial: **pendiente** (§16).

### 8.6 Excedentes

- **Excedente de cobranza no depositada:** cobranza válida con saldo pendiente de conciliar → alimenta alertas (§11).  
- **Excedente de depósito:** §6.5.

---

## 9. Cálculos clave

Todos los totales de tablero/reportes deben declarar: **rango de fechas**, **organización**, **moneda de presentación** (típ. ARS), y reglas FX del §10.

| Métrica | Definición determinística |
|---------|---------------------------|
| **Total facturado** | Suma de `total_a_cobrar` de ventas con estado ∈ { `emitida`, `parcialmente_cobrada`, `cobrada`, `vencida` } en el rango (filtro por `fecha_factura` salvo que reporte diga otra base). Convertido a moneda de presentación con **tasa de facturación persistida en la venta** para conversión a ARS si aplica. |
| **Total cobrado** | Suma de **brutos** de cobranzas **válidas** con `fecha_cobranza` en rango, **sin** deducir gastos; moneda de presentación según tasa **persistida en la cobranza** para ARS equivalente. |
| **Total cobrado neto** | Suma de **netos** (§5.2) de cobranzas válidas en rango, misma regla de conversión. |
| **Total depositado** | Suma de `importe_deposito` de depósitos no eliminados con `fecha_deposito` en rango; conversión con tasa **persistida en el depósito** si se muestra en ARS. |
| **Pendiente por cobrar** | Para ventas no `cobrada` ni `cancelada` ni `borrador`: `total_a_cobrar - cobrado_acumulado` (en moneda de cada venta; agregación a ARS con reglas §10). |
| **Pendiente por depositar** | Suma de **netos** de cobranzas válidas **no totalmente conciliadas** a depósitos (saldo pendiente de conciliación), en moneda de presentación. |

### 9.1 Margen / colchón “para depositar”

**Pendiente de definición explícita (no implementar suposición):**  
fórmula de **margen para depositar** (p. ej. relación entre cobrado neto, comisiones, retenciones y depósitos esperados por calendario). Debe resolverse en documento de KPI antes de codificar widgets que lo muestren.

---

## 10. Tipo de cambio (FX)

### 10.1 Principio

El tipo de cambio **nunca** es solo formato de UI: toda conversión que afecte KPIs o saldos declarativos debe basarse en **tasas persistidas** en el registro correspondiente o en la **línea de imputación/conciliación**.

### 10.2 Dónde se guarda (mínimo conceptual)

| Evento | Qué se persiste |
|--------|------------------|
| Emisión de venta | Si la venta es USD y se necesita ARS equivalente: `tasa_ARS_por_unidad_USD` al emitir (o paridad 1 si ARS). |
| Imputación cobranza → venta | `tasa` usada para convertir monto imputado a `moneda_venta`. |
| Depósito | Si se requiere equivalente ARS: tasa al **fecha_deposito** o tasa declarada en registro. |
| Conciliación cruzada | Tasa por línea o por sesión (**pendiente** política §16). |

### 10.3 Desvíos

**Desvío FX** (para alertas): diferencia entre (a) tasa esperada por política (ej. promedio BCRA venta del día **pendiente** de integración) y (b) tasa usada en la operación, superior a umbral **pendiente** (§16).

### 10.4 Impacto

Los totales en ARS del tablero usan **solo** equivalentes persistidos; no recalcular histórico con tasa del día actual salvo reporte explícito “revalorizado” **fuera de MVP** salvo definición contraria (§16).

---

## 11. Alertas

Cada alerta tiene: `tipo`, `severidad`, `organization_id`, referencia a entidad, `creada_en`, estado `abierta` / `reconocida` / `cerrada` (nombres exactos implementables).

| Tipo | Condición de disparo (base) |
|------|------------------------------|
| **Factura vencida** | Existe venta `vencida` según §4. |
| **Cobranza sin documentación** | Cobranza válida sin al menos **N** archivos obligatorios por `medio_cobro` (**N** y medios **pendientes** en catálogo §16). |
| **Cobranza no depositada** | Saldo pendiente de conciliación > 0 y `fecha_cobranza` + `D` días < fecha_actual (**D pendiente** §16). |
| **Desvío FX** | Regla §10.3 con umbral configurado. |
| **Inconsistencia** | Violación de invariantes detectada en job (ej. suma de imputaciones > bruto): **crítica**; requiere auditoría y acción manual. |

**Resolución:** algunas se cierran automáticamente al corregir datos; otras requieren reconocimiento humano.

---

## 12. Permisos

### 12.1 Modelo de permisos (regla dura)

- Existen **módulos** de producto (ventas, cobranzas, bancos, clientes, reportes, configuración, …) y **acciones** por módulo: `view`, `create`, `edit`, `archive`, `export`, `send`, `manage` (lista cerrada en implementación de matriz).  
- Cada **rol** (`owner`, `admin`, `operativo`) tiene **módulos habilitados** y, por módulo, acciones permitidas.  
- La configuración efectiva se persiste como **matriz** (tablas normalizadas): **no** se autoriza lógica basada en checks sueltos hardcodeados por pantalla; los checks en código deben leer capacidades resueltas desde esa matriz (o caché invalidable de la misma fuente).

### 12.2 Evaluación

- **Auth.js** autentica (identidad/sesión); **la app** autoriza.  
- Toda mutación y toda lectura sensible valida en **backend**: `usuario ∈ org`, **módulo habilitado**, **acción permitida**.  
- La UI solo **oculta** o **deshabilita** por UX; **no** es control de seguridad.

### 12.3 Owner

- **Un único `owner` por organización.**  
- El **owner** puede **todas** las acciones sobre **todos** los módulos de su organización, incluida la gestión de matriz y de equipo.  
- **Invariante:** no se puede crear segundo owner sin transferencia explícita documentada (**flujo pendiente** §16).

### 12.4 Otros roles

- **admin** y **operativo** efectúan solo lo que la matriz permita para su rol.  
- Cambios en la matriz solo **owner** (salvo política futura explícita).

### 12.4.1 Invitaciones a equipo

- **owner** y **admin** pueden invitar por **correo** con rol destino **`admin`** u **`operativo`** (no se invita `owner`; el único owner por org sigue §12.3).  
- La invitación se materializa como `membership_invitations` (ERD §2.3.1) hasta que el invitado acepte con el mismo correo y exista `membership` **active**.  
- Revocar o sustituir invitaciones pendientes del mismo correo en la misma org queda a criterio de implementación (hoy: revocar pendientes al emitir una nueva).

### 12.5 Intento sin permiso

- El servidor responde **403** (o error de negocio equivalente) y **no** aplica la mutación.  
- Se registra en **auditoría** como `permiso_denegado` si el producto lo incluye (**opcional** pero recomendado para `manage`/`export`).

---

## 13. Edición de datos

### 13.1 General

- **Owner:** puede editar cualquier campo permitido por el modelo salvo invariantes (ej. no romper `organization_id`).  
- **Otros:** según `edit` y reglas por entidad.

### 13.2 Campos críticos post-emisión

Tras `emitida`, los campos **monto total**, **moneda**, **cliente**, **fecha_factura**, **dias_credito** solo se editan si:

- permiso explícito `ventas:editar_critico` (nombre en matriz), **y**  
- **auditoría obligatoria** con antes/después.

### 13.3 Cuándo deja de ser editable

- **Cancelada:** no editable salvo nota aclaratoria **pendiente** (§16).  
- Entidades **archivadas / soft-deleted:** no editables salvo `undelete` con permiso `manage` y auditoría.

### 13.4 Auditoría obligatoria (mínimo)

- Anulación de cobranza, cierre/reapertura de conciliación, cambios de matriz de permisos, export masivo, edición de campos críticos, cambio de owner.

---

## 14. Eliminación

### 14.1 Soft delete

- **Política por defecto:** ninguna entidad sensible se elimina físicamente desde la app usuaria.  
- Se usa `deleted_at` / `archived_at` y estado de negocio apropiado (`cancelada`, cobranza `anulada`, etc.).

### 14.2 Entidades que no se borran físicamente (lista mínima)

Ventas, cobranzas, depósitos, transferencias, conciliaciones y sus líneas, archivos (objeto R2 + metadata), registros de auditoría, definiciones de reporte y programaciones, memberships.

### 14.3 Impacto en reportes

- Reportes operativos **excluyen** soft-deleted por defecto.  
- Reportes de auditoría / histórico pueden **incluir** con filtro explícito.

---

## 15. Auditoría

### 15.1 Qué acciones se registran (mínimo)

- CRUD en ventas, cobranzas, depósitos, transferencias, conciliaciones, clientes, archivos, matriz de permisos, programaciones de reporte, exportaciones (`export`), envíos (`send`), login fallido repetido **opcional**.  
- Denegaciones de permiso **recomendadas** para acciones sensibles.

### 15.2 Qué datos se guardan

- `actor_user_id`, `organization_id`, `action`, `entity_type`, `entity_id`, `occurred_at`, `payload` (diff o snapshot JSON acotado), `ip`/`user_agent` según política de privacidad.

### 15.3 Quién puede verlos

- **Owner:** visibilidad completa en su organización.  
- **Otros:** solo si la matriz incluye permiso de auditoría (ej. `auditoria:view`); por defecto **solo owner** en MVP salvo que se configure lo contrario explícitamente.

---

## 16. Reglas abiertas / pendientes de producto

Cerrar en documentos posteriores (KPI, catálogos, ERD):

1. **Margen / “para depositar”** — fórmula y fuentes de datos.  
2. **Catálogo de medios de cobro** y **N** documentos obligatorios por medio.  
3. **D** días para alerta “cobranza no depositada”.  
4. **Conciliación en distinta moneda** — política de tasas por línea vs sesión.  
5. **Tolerancia de redondeo** numérica global por organización.  
6. **Vencimiento mismo día** con `dias_credito = 0`.  
7. **Reversión de venta `cobrada`** y **reapertura de `cancelada`**.  
8. **Anulación de cobranza** ya conciliada: modelo compensatorio exacto.  
9. **Desvío FX** — tasa de referencia y umbral.  
10. **Lista cerrada de módulos y acciones** en la matriz persistida.  
11. **Transferencias con comisión** bancaria explícita.  
12. **Cliente obligatoriedad** y ventas sin cliente.  
13. **Multi-línea de venta** vs venta de importe único.  
14. **Reportes “revalorizados”** con tasa del día (fuera de MVP por defecto).

---

## 17. Ajustes respecto de ARCHITECTURE.md (reflejados en negocio)

### 17.1 Permisos

- Módulos habilitados por rol + acciones por módulo; evaluación **solo en backend**; matriz **persistida** como fuente de verdad (§12).

### 17.2 Reportes programados (parte del dominio desde el MVP)

Conceptos de negocio mínimos:

- **Definición de reporte:** tipo de reporte, columnas/agregaciones estándar, permiso requerido para ejecutarlo.  
- **Programación:** frecuencia (cron), zona horaria, estado activo/inactivo, usuario creador.  
- **Destinatarios:** emails autorizados para la org; validación de pertenencia o lista explícita.  
- **Filtros guardados** opcionales vinculados a la definición.

La implementación técnica puede ser por fases; el **modelo conceptual** no es opcional.

### 17.3 Archivos

- Acceso **controlado**; descarga vía **URL firmada de corta duración** generada en backend tras chequeo de membresía y vínculo a entidad, **sin** buckets públicos de lectura anónima.

### 17.4 Reutilización UI

- Regla dura de producto/ingeniería: **no** crear variantes arbitrarias por pantalla de tablas, formularios, filtros, modales de confirmación ni patrones equivalentes; deben provenir del **sistema reutilizable** (`packages/ui` + tokens), alineado a `ARCHITECTURE.md`.

---

**Fin del documento.**
