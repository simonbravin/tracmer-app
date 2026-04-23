# Skill — frontend y UI (tracmer-app)

## Cuándo usarla

Páginas, layouts, componentes, tablas, formularios, filtros, theming, accesibilidad ligada a UI.

## Qué priorizar

- `docs/architecture/ARCHITECTURE.md` §9 + `docs/ai/AI_CONTEXT.md` §8.  
- **shadcn/ui** + Tailwind.  
- **Shell** tipo **Efferd** (sidebar + topbar), layouts anidados.  
- **Light/dark** con **tokens** compartidos (CSS variables / tema); sin colores sueltos por página.  
- **Reutilización obligatoria:** tablas, formularios, filtros, modales de confirmación desde **`packages/ui`** (o el paquete compartido que exista).  
- Copy en **español (Argentina)**; sin i18n MVP.

## Errores a evitar

- Duplicar tabla/formulario/filtro “porque esta pantalla es distinta”.  
- Lógica financiera definitiva o permisos reales solo en el cliente.  
- Estilos one-off que rompan densidad/spacing del sistema.  
- Ignorar modo oscuro o tokens.
