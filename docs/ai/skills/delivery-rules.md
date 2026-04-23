# Skill — entrega y disciplina (tracmer-app)

## Cuándo usarla

Siempre: aplica a todo PR, parche o iteración con IA.

## Qué priorizar

- `docs/ai/AI_CONTEXT.md` §11–12 + `ARCHITECTURE.md` §20.

## Reglas

- **Cambios pequeños** y revisables; un objetivo por cambio cuando sea posible.  
- **No refactorizar** masivamente ni “limpiar” fuera de alcance.  
- **No tocar** archivos/módulos no pedidos.  
- **Documentar supuestos** cuando un doc diga PENDIENTE y igual haya que avanzar: opción mínima segura + nota breve.  
- En la respuesta/PR: **qué cambió**, **por qué**, **lista de archivos tocados**.  
- Si dos docs **se contradicen**, **no asumir**: describí el conflicto y pedí corrección en docs antes de codificar lo ambiguo.

## Errores a evitar

- Megadiffs mezclando feature + formato + renombres no relacionados.  
- Silenciar PENDIENTE de producto con lógica inventada.  
- Omitir lista de archivos o el impacto en tenant/permisos.
