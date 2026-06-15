# Internship Management System

Sistema web para gestionar estudiantes, grupos y evaluaciones de competencias durante pasantias tecnicas. La aplicacion permite registrar puntajes por habilidad, generar tarjetas imprimibles, preparar correos para encargados y apoyar el seguimiento docente con un asistente de retroalimentacion inteligente.

## Stack

- React 19
- Vite
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security
- Supabase Edge Functions

## Funcionalidades Principales

- Inicio de sesion con Supabase Auth.
- Vista de orientadora para administrar grupos, estudiantes, profesores y encargados.
- Vista de profesor para evaluar estudiantes por habilidades blandas y cognitivas.
- Dashboard con promedio grupal, estudiantes visibles, observaciones y seguimiento prioritario.
- Busqueda por nombre o correo.
- Filtro por nivel de seguimiento: regular, preventivo o prioritario.
- Guardado de puntajes en `evaluation_scores`.
- Guardado de observaciones en `evaluations`.
- Cierre de etapa con evaluaciones bloqueadas.
- Tarjeta imprimible para PDF.
- Preparacion de correo al encargado mediante el cliente de correo local.
- Asistente IA explicable para fortalezas, areas de mejora y recomendaciones.

## Ejecutar el Proyecto

Desde esta carpeta:

```bash
npm install
npm run dev
```

Tambien se puede ejecutar desde la carpeta contenedora del repositorio:

```bash
npm run dev
```

El servidor de desarrollo se abre normalmente en:

```text
http://localhost:5173
```

## Build de Produccion

```bash
npm run build
```

Para revisar el build:

```bash
npm run preview
```

## Variables de Entorno

Crear un archivo `.env` en esta carpeta:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

No se deben colocar claves privadas en el frontend.

## Configuracion de Supabase

1. Abrir el SQL Editor de Supabase.
2. Ejecutar el contenido de `supabase/schema.sql`.
3. Crear usuarios en `Authentication > Users`.
4. Copiar el UUID de cada usuario Auth.
5. Insertar el perfil correspondiente en `public.profiles`.
6. Ejecutar `supabase/seed.sql` si se desean datos demo, reemplazando primero los UUID placeholder.

### Usuario con Mayor Acceso

El rol con mayor acceso funcional es:

```text
orientadora
```

Ejemplo de perfil:

```sql
insert into public.profiles (id, full_name, email, role, is_active)
values (
  'UUID_DEL_USUARIO_AUTH',
  'Orientadora Demo',
  'admin.demo@example.com',
  'orientadora',
  true
);
```

La contrasena no vive en el repositorio. Se define al crear el usuario en Supabase Auth.

## Edge Function

El asistente de retroalimentacion esta en:

```text
supabase/functions/ai-feedback-assistant/index.ts
```

Esta funcion genera retroalimentacion explicable con reglas internas y no requiere servicios pagos. Para desplegarla desde Supabase CLI:

```bash
supabase functions deploy ai-feedback-assistant
```

## Despliegue en un Dominio

El profesor puede desplegar el frontend como cualquier app Vite:

1. Ejecutar `npm run build`.
2. Publicar el contenido generado en `dist/`.
3. Configurar las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el proveedor de hosting.
4. Aplicar `supabase/schema.sql` en el proyecto Supabase real.
5. Crear usuarios Auth y perfiles en `public.profiles`.
6. Desplegar la Edge Function si se desea guardar retroalimentacion generada desde backend.

## Archivos Relevantes

- `src/App.jsx`: flujo principal de autenticacion, carga de datos, administracion y evaluacion.
- `src/features/gradebook/components/GradebookDashboard.jsx`: metricas, busqueda y filtros.
- `src/features/gradebook/components/GradebookTable.jsx`: matriz de evaluacion.
- `src/features/gradebook/components/EvaluationPreview.jsx`: tarjeta PDF y correo al encargado.
- `src/features/ai-feedback`: asistente de retroalimentacion.
- `src/lib/supabase.js`: cliente Supabase.
- `supabase/schema.sql`: estructura de base de datos, RLS y permisos.
- `supabase/seed.sql`: datos demo.

## Nota de Sostenibilidad

El componente de inteligencia artificial se implemento como un sistema explicable basado en reglas para evitar costos, uso de claves privadas o dependencia de APIs pagas. La arquitectura permite conectar otro proveedor posteriormente desde una Edge Function sin exponer secretos en el frontend.
