# Evaluacion de Pasantias

Base inicial para una aplicacion web con React + Vite + Tailwind y backend pensado para Supabase.

## Estructura

- `src/features/gradebook`: pantalla principal de evaluacion por etapa.
- `src/components/ui`: base de componentes estilo Shadcn/UI.
- `supabase/schema.sql`: modelo de datos, enums, RLS y tablas principales.

## Ejecutar

```bash
npm install
npm run dev
```

## Notas de implementacion

- La tabla permite pegar bloques tabulados desde Excel o Google Sheets.
- Las notas arrancan en `3` por defecto y se limitan entre `1` y `3`.
- El cierre de etapa cambia la UI a solo lectura para representar el bloqueo permanente.
- El payload mostrado en pantalla modela el `upsert` que luego debe conectarse a Supabase.
