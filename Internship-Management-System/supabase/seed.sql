-- Seed demo para Evaluacion de estudiantes en pasantias
-- 1. Crea primero un usuario en Supabase Auth: Authentication > Users > Add user.
-- 2. Copia el UUID de ese usuario y reemplazalo en teacher_auth_id.
-- 3. Ajusta teacher_email para que sea el mismo correo del usuario Auth.

do $$
declare
  admin_auth_id uuid := '00000000-0000-0000-0000-000000000000';
  admin_email text := 'admin.demo@example.com';
  admin_name text := 'Orientadora Demo';
  teacher_auth_id uuid := '00000000-0000-0000-0000-000000000000';
  teacher_email text := 'profesor.demo@example.com';
  teacher_name text := 'Profesor Demo';

  software_specialty_id uuid;
  accounting_specialty_id uuid;
  group_id uuid;
  stage_id uuid;
  student_maria_id uuid;
  student_kevin_id uuid;
  student_daniela_id uuid;
  guardian_maria_id uuid;
  guardian_kevin_id uuid;
  guardian_daniela_id uuid;
begin
  if teacher_auth_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Reemplaza teacher_auth_id con el UUID real del usuario creado en Supabase Auth.';
  end if;

  insert into public.specialties (name)
  values
    ('Desarrollo de Software'),
    ('Contabilidad'),
    ('Ejecutivo Comercial'),
    ('Ciberseguridad'),
    ('Diseno Grafico'),
    ('Soporte TI'),
    ('Electronica')
  on conflict (name) do nothing;

  select id into software_specialty_id
  from public.specialties
  where name = 'Desarrollo de Software';

  select id into accounting_specialty_id
  from public.specialties
  where name = 'Contabilidad';

  insert into public.profiles (id, full_name, email, role, is_active)
  values (teacher_auth_id, teacher_name, teacher_email, 'profesor', true)
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    is_active = excluded.is_active;

  if admin_auth_id <> '00000000-0000-0000-0000-000000000000' then
    insert into public.profiles (id, full_name, email, role, is_active)
    values (admin_auth_id, admin_name, admin_email, 'orientadora', true)
    on conflict (id) do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      role = excluded.role,
      is_active = excluded.is_active;
  end if;

  insert into public.student_groups (code, label, school_year, specialty_id, max_students)
  values ('11A-SOFT-2026', '11A Desarrollo de Software', 11, software_specialty_id, 18)
  on conflict (code) do update
  set
    label = excluded.label,
    school_year = excluded.school_year,
    specialty_id = excluded.specialty_id,
    max_students = excluded.max_students
  returning id into group_id;

  insert into public.group_teachers (group_id, teacher_profile_id, is_primary, starts_on)
  values (group_id, teacher_auth_id, true, current_date)
  on conflict (group_id, teacher_profile_id, starts_on) do update
  set is_primary = excluded.is_primary;

  insert into public.stages (name, starts_on, ends_on, is_open, is_final)
  values ('Etapa demo Abril-Mayo 2026', '2026-04-01', '2026-05-31', true, false)
  on conflict do nothing;

  select id into stage_id
  from public.stages
  where name = 'Etapa demo Abril-Mayo 2026'
  order by created_at desc
  limit 1;

  insert into public.skills (specialty_id, skill_type, code, label, description, sort_order, is_active)
  values
    (null, 'soft', 'soft-communication', 'Comunicacion asertiva', 'Expresa ideas con claridad y escucha activamente.', 10, true),
    (null, 'soft', 'soft-teamwork', 'Trabajo en equipo', 'Colabora con companeros y responsables.', 20, true),
    (null, 'soft', 'soft-responsibility', 'Responsabilidad', 'Cumple horarios, tareas y acuerdos.', 30, true),
    (null, 'soft', 'soft-adaptability', 'Adaptabilidad', 'Responde bien ante cambios y retroalimentacion.', 40, true),
    (software_specialty_id, 'cognitive', 'softdev-logic', 'Logica de programacion', 'Construye soluciones con razonamiento ordenado.', 110, true),
    (software_specialty_id, 'cognitive', 'softdev-debugging', 'Resolucion de errores', 'Identifica causas y corrige fallos.', 120, true),
    (software_specialty_id, 'cognitive', 'softdev-datamodel', 'Modelado de datos', 'Organiza informacion con estructuras adecuadas.', 130, true),
    (accounting_specialty_id, 'cognitive', 'acct-ledger', 'Registro contable', 'Registra operaciones con precision.', 210, true),
    (accounting_specialty_id, 'cognitive', 'acct-analysis', 'Analisis financiero', 'Interpreta informacion financiera basica.', 220, true)
  on conflict (code) do update
  set
    specialty_id = excluded.specialty_id,
    skill_type = excluded.skill_type,
    label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

  insert into public.students (student_code, full_name, email, specialty_id, group_id)
  values
    ('STD-2026-001', 'Maria Fernanda Rojas', 'maria.rojas@example.edu', software_specialty_id, group_id),
    ('STD-2026-002', 'Kevin Josue Vargas', 'kevin.vargas@example.edu', software_specialty_id, group_id),
    ('STD-2026-003', 'Daniela Cordero Ruiz', 'daniela.cordero@example.edu', software_specialty_id, group_id)
  on conflict (student_code) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    specialty_id = excluded.specialty_id,
    group_id = excluded.group_id;

  select id into student_maria_id from public.students where student_code = 'STD-2026-001';
  select id into student_kevin_id from public.students where student_code = 'STD-2026-002';
  select id into student_daniela_id from public.students where student_code = 'STD-2026-003';

  insert into public.guardians (full_name, email, phone)
  values
    ('Ana Rojas', 'ana.rojas@example.com', '+506 8888-0101'),
    ('Carlos Vargas', 'carlos.vargas@example.com', '+506 8888-0202'),
    ('Patricia Ruiz', 'patricia.ruiz@example.com', '+506 8888-0303')
  on conflict (email) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone;

  select id into guardian_maria_id from public.guardians where email = 'ana.rojas@example.com';
  select id into guardian_kevin_id from public.guardians where email = 'carlos.vargas@example.com';
  select id into guardian_daniela_id from public.guardians where email = 'patricia.ruiz@example.com';

  insert into public.student_guardians (student_id, guardian_id, relationship, is_primary)
  values
    (student_maria_id, guardian_maria_id, 'Madre', true),
    (student_kevin_id, guardian_kevin_id, 'Padre', true),
    (student_daniela_id, guardian_daniela_id, 'Madre', true)
  on conflict (student_id, guardian_id) do update
  set
    relationship = excluded.relationship,
    is_primary = excluded.is_primary;

  insert into public.evaluations (student_id, stage_id, evaluator_profile_id, group_id, observations, status)
  values
    (student_maria_id, stage_id, teacher_auth_id, group_id, '', 'draft'),
    (student_kevin_id, stage_id, teacher_auth_id, group_id, '', 'draft'),
    (student_daniela_id, stage_id, teacher_auth_id, group_id, '', 'draft')
  on conflict (student_id, stage_id) do update
  set
    evaluator_profile_id = excluded.evaluator_profile_id,
    group_id = excluded.group_id;
end $$;
