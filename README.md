# Internship Management System

Sistema web para gestionar grupos, estudiantes y evaluaciones de competencias en pasantias tecnicas.

El proyecto usa React + Vite en el frontend y Supabase como backend para autenticacion, base de datos PostgreSQL, politicas RLS y persistencia de evaluaciones.

## Estado Actual

La aplicacion ya cuenta con:

- Login con Supabase Auth.
- Sesion no persistente: al recargar se vuelve a pedir autenticacion.
- Vista de profesor para evaluar estudiantes por matriz de habilidades.
- Vista de admin/orientadora para ver todos los grupos y estudiantes.
- Registro de estudiantes con encargado.
- Eliminacion de estudiantes desde admin.
- Creacion de grupos desde admin.
- Registro/asignacion de profesores a grupos.
- Guardado real de puntajes en Supabase con `upsert`.

## Stack

- React 19
- Vite
- Tailwind CSS
- Supabase JS
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security (RLS)

## Estructura Importante

```text
Internship-Management-System/
  src/
    App.jsx
    lib/
      supabase.js
      mock-data.js
    features/
      gradebook/
        components/
        utils/
          gradebook.js
  supabase/
    schema.sql
    seed.sql
  .env
  package.json
```

## Variables De Entorno

Crear un archivo `.env` en la raiz del proyecto:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Vite solo expone variables que empiezan con `VITE_`.

## Instalacion

```bash
npm install
```

## Ejecutar En Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Supabase

### 1. Aplicar Schema

Ejecutar el contenido de:

```text
supabase/schema.sql
```

en el SQL Editor de Supabase.

Este archivo crea:

- tipos enum
- tablas
- funciones auxiliares
- triggers
- grants
- policies RLS
- indices

### 2. Crear Usuarios Auth

Los usuarios deben crearse primero en:

```text
Supabase Dashboard > Authentication > Users
```

Luego se copia el UUID del usuario y se registra en `public.profiles`.

### 3. Ejecutar Seed Demo

Editar primero:

```text
supabase/seed.sql
```

Reemplazar:

```sql
admin_auth_id
teacher_auth_id
```

con UUIDs reales de usuarios creados en Supabase Auth.

Luego ejecutar el seed en el SQL Editor.

## Roles

Los roles se guardan en `public.profiles.role`.

Valores actuales:

```sql
'orientadora'
'profesor'
'estudiante'
'encargado'
```

### Orientadora/Admin

Puede:

- ver todos los grupos
- ver todos los estudiantes por grupo
- crear grupos
- asignar profesor a grupo
- registrar profesores en `profiles`
- registrar estudiantes
- registrar encargados
- eliminar estudiantes

### Profesor

Puede:

- ver sus grupos asignados
- ver estudiantes de sus grupos
- registrar estudiantes en sus grupos
- evaluar estudiantes
- guardar puntajes

## APIs De Supabase Usadas

### Auth

Login:

```js
supabase.auth.signInWithPassword({
  email,
  password,
});
```

Logout:

```js
supabase.auth.signOut();
```

Obtener usuario actual:

```js
supabase.auth.getUser();
```

Escuchar cambios de autenticacion:

```js
supabase.auth.onAuthStateChange((_event, session) => {
  // actualizar sesion local
});
```

### Cliente Supabase

Archivo:

```text
src/lib/supabase.js
```

Configuracion actual:

```js
createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
```

Esto fuerza login al recargar la pagina.

## Tablas Principales

### `profiles`

Perfil interno de cada usuario Auth.

Campos clave:

```sql
id uuid references auth.users(id)
full_name text
email text
role app_role
```

### `student_groups`

Grupos academicos.

```sql
code
label
school_year
specialty_id
max_students
```

### `group_teachers`

Relacion profesor-grupo.

```sql
group_id
teacher_profile_id
is_primary
starts_on
ends_on
```

### `students`

Estudiantes.

```sql
student_code
full_name
email
specialty_id
group_id
```

### `guardians`

Encargados o padres.

```sql
full_name
email
phone
```

### `student_guardians`

Relacion estudiante-encargado.

### `stages`

Etapas de evaluacion.

La app busca una etapa abierta:

```js
.eq("is_open", true)
```

### `skills`

Habilidades blandas y cognitivas.

La app carga habilidades activas:

```js
.eq("is_active", true)
```

Y filtra:

```text
specialty_id is null OR specialty_id = group.specialty_id
```

### `evaluations`

Evaluacion por estudiante y etapa.

Restriccion clave:

```sql
unique (student_id, stage_id)
```

### `evaluation_scores`

Puntajes por evaluacion y habilidad.

Llave primaria:

```sql
primary key (evaluation_id, skill_id)
```

La app guarda puntajes con:

```js
supabase.from("evaluation_scores").upsert(
  {
    evaluation_id,
    skill_id,
    score,
  },
  {
    onConflict: "evaluation_id,skill_id",
  },
);
```

## Flujo De Profesor

1. Usuario inicia sesion.
2. Se consulta `profiles`.
3. Si el rol es `profesor`, se cargan sus grupos visibles por RLS.
4. Se selecciona el primer grupo disponible.
5. Se cargan estudiantes del grupo.
6. Se cargan habilidades activas.
7. Se carga la etapa abierta.
8. Se buscan evaluaciones existentes.
9. Se crean evaluaciones faltantes.
10. Se guarda un mapa local:

```js
{
  [studentId]: evaluationId
}
```

11. Al hacer click en un puntaje, se hace `upsert` en `evaluation_scores`.

## Flujo De Admin

1. Usuario inicia sesion.
2. Se consulta `profiles`.
3. Si el rol es `orientadora`, se muestra la vista admin.
4. Se cargan todos los grupos.
5. Se cargan estudiantes dentro de cada grupo.
6. Se pueden crear grupos.
7. Se pueden asignar profesores.
8. Se pueden registrar alumnos y encargados.
9. Se pueden eliminar estudiantes.

## Seguridad Y RLS

La seguridad real esta en Supabase, no en el frontend.

Funciones importantes:

```sql
public.current_profile_role()
public.can_manage_group(target_group_id)
public.evaluation_is_editable(target_evaluation_id)
```

Estas funciones usan:

```sql
security definer
set search_path = public
```

para evitar recursion de RLS y permitir validaciones internas.

## Limitacion Actual

El frontend no crea usuarios en Supabase Auth directamente.

Para registrar profesores desde la app:

1. Crear primero el usuario en Supabase Auth.
2. Copiar el UUID.
3. Usar el formulario admin para crear el perfil y asignarlo a un grupo.

Para crear usuarios Auth directamente desde la app se recomienda una Supabase Edge Function o backend con `service_role`. Ese secreto no debe estar en el frontend.

## Archivos Para Revisar Primero

- `src/App.jsx`: flujo principal, login, admin, profesor y formularios.
- `src/lib/supabase.js`: configuracion del cliente Supabase.
- `src/features/gradebook/utils/gradebook.js`: adaptadores de datos para la matriz.
- `supabase/schema.sql`: tablas, funciones, triggers, RLS y grants.
- `supabase/seed.sql`: datos demo.

## Notas Para Nuevas Ramas

Antes de empezar a trabajar:

1. Confirmar que `.env` apunta al proyecto Supabase correcto.
2. Confirmar que `schema.sql` ya fue aplicado.
3. Confirmar que existen usuarios Auth.
4. Confirmar que `profiles.id` coincide con `auth.users.id`.
5. Confirmar que existe al menos una etapa con `is_open = true`.
6. Confirmar que el usuario profesor esta asignado en `group_teachers`.

