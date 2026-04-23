# Skill — producto y negocio (tracmer-app)

## Cuándo usarla

Tareas de alcance, reglas de dominio, estados, KPIs, copy de negocio, flujos facturado/cobrado/depositado/conciliado, o cuando haya riesgo de “inventar producto”.

## Qué es

**tracmer-app:** plataforma **administrativo-financiera** para empresas de transporte. Resuelve control de **ventas facturadas**, **cobranzas**, **depósitos**, **transferencias entre cuentas**, **conciliación**, reportes/exportes, alertas y auditoría.

## Qué no es

**No es un TMS:** nada de rutas, viajes, flota, dispatch, GPS, ejecución logística.

## Conceptos clave (no mezclar)

- **Venta:** lo facturado; estados y vencimiento según `BUSINESS_RULES.md` §3–4.  
- **Cobranza:** dinero recibido; imputación a ventas.  
- **Depósito:** dinero en banco; **sin** FK directa a venta.  
- **Conciliación:** vínculo N:M cobranza↔depósito con líneas y diferencias categorizadas.

## Priorizar

`docs/product/BUSINESS_RULES.md` + `docs/ai/AI_CONTEXT.md` §3–5.

## Errores a evitar

- Tratar el proyecto como TMS o agregar “un poco de logística”.  
- Inventar reglas marcadas **PENDIENTE** en BR/ERD.  
- Colapsar venta/cobranza/depósito en un solo concepto genérico.
