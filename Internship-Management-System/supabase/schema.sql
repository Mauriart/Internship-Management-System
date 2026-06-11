-- Proyecto: Evaluacion de estudiantes en pasantias
-- Base: Supabase PostgreSQL

create extension if not exists "pgcrypto";

create type public.app_role as enum ('orientadora', 'profesor', 'estudiante', 'encargado');
create type public.evaluation_status as enum ('draft', 'submitted', 'locked');
create type public.skill_type as enum ('soft', 'cognitive');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  school_year smallint not null check (school_year in (11, 12)),
  specialty_id uuid not null references public.specialties (id),
  max_students smallint not null default 18 check (max_students between 1 and 18),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.group_teachers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.student_groups (id) on delete cascade,
  teacher_profile_id uuid not null references public.profiles (id),
  is_primary boolean not null default true,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default timezone('utc', now()),
  constraint active_teacher_period check (ends_on is null or ends_on >= starts_on),
  constraint unique_active_assignment unique (group_id, teacher_profile_id, starts_on)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  full_name text not null,
  email text not null unique,
  specialty_id uuid not null references public.specialties (id),
  group_id uuid not null references public.student_groups (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_guardians (
  student_id uuid not null references public.students (id) on delete cascade,
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  relationship text not null,
  is_primary boolean not null default true,
  primary key (student_id, guardian_id)
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_open boolean not null default true,
  is_final boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint valid_stage_dates check (ends_on >= starts_on)
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  specialty_id uuid references public.specialties (id),
  skill_type public.skill_type not null,
  code text not null unique,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint specialty_rule check (
    (skill_type = 'soft' and specialty_id is null)
    or (skill_type = 'cognitive' and specialty_id is not null)
  )
);

create table if not exists public.rubrics (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null unique references public.skills (id) on delete cascade,
  level_1 text not null,
  level_2 text not null,
  level_3 text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  stage_id uuid not null references public.stages (id),
  evaluator_profile_id uuid not null references public.profiles (id),
  group_id uuid not null references public.student_groups (id),
  checklist_completed boolean not null default false,
  observations text not null default '',
  status public.evaluation_status not null default 'draft',
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint unique_student_stage unique (student_id, stage_id)
);

create table if not exists public.evaluation_scores (
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  skill_id uuid not null references public.skills (id),
  score smallint not null default 3 check (score between 1 and 3),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (evaluation_id, skill_id)
);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  stage_id uuid not null references public.stages (id) on delete cascade,
  evaluation_id uuid references public.evaluations (id) on delete set null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  strengths text[] not null default '{}',
  improvement_areas text[] not null default '{}',
  student_recommendations text[] not null default '{}',
  teacher_recommendations text[] not null default '{}',
  summary text not null default '',
  model_version text not null default 'rules-v1',
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint unique_ai_feedback_student_stage unique (student_id, stage_id)
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  recipient_email text not null,
  recipient_type public.app_role not null,
  provider text not null default 'resend',
  delivery_status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_evaluations_updated_at on public.evaluations;
create trigger set_evaluations_updated_at
before update on public.evaluations
for each row execute function public.set_updated_at();

drop trigger if exists set_evaluation_scores_updated_at on public.evaluation_scores;
create trigger set_evaluation_scores_updated_at
before update on public.evaluation_scores
for each row execute function public.set_updated_at();

drop trigger if exists set_ai_feedback_updated_at on public.ai_feedback;
create trigger set_ai_feedback_updated_at
before update on public.ai_feedback
for each row execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.can_manage_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_teachers gt
    join public.profiles p on p.id = gt.teacher_profile_id
    where gt.group_id = target_group_id
      and gt.teacher_profile_id = auth.uid()
      and p.role in ('profesor', 'orientadora')
      and (gt.ends_on is null or gt.ends_on >= current_date)
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'orientadora'
  )
$$;

create or replace function public.evaluation_is_editable(target_evaluation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.evaluations e
    join public.stages s on s.id = e.stage_id
    where e.id = target_evaluation_id
      and e.status <> 'locked'
      and s.is_open = true
      and public.can_manage_group(e.group_id)
  )
$$;

create or replace function public.prevent_locked_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'evaluations' then
    if old.status = 'locked' then
      raise exception 'Esta evaluacion ya fue cerrada y no permite cambios';
    end if;
  end if;

  if tg_table_name = 'evaluation_scores' then
    if exists (
      select 1
      from public.evaluations e
      where e.id = old.evaluation_id
        and e.status = 'locked'
    ) then
      raise exception 'Las calificaciones de una evaluacion cerrada no se pueden modificar';
    end if;
  end if;

  return new;
end;
$$;

alter table public.profiles enable row level security;
alter table public.specialties enable row level security;
alter table public.student_groups enable row level security;
alter table public.group_teachers enable row level security;
alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.stages enable row level security;
alter table public.skills enable row level security;
alter table public.rubrics enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.notification_queue enable row level security;

grant usage on schema public to authenticated;

grant select on table
  public.profiles,
  public.specialties,
  public.student_groups,
  public.group_teachers,
  public.students,
  public.guardians,
  public.student_guardians,
  public.stages,
  public.skills,
  public.rubrics,
  public.evaluations,
  public.evaluation_scores,
  public.ai_feedback
to authenticated;

grant insert, update on table public.evaluations to authenticated;
grant insert, update on table public.evaluation_scores to authenticated;
grant insert, update on table public.ai_feedback to authenticated;
grant insert, update on table public.profiles to authenticated;
grant insert, update on table public.student_groups to authenticated;
grant insert, update on table public.group_teachers to authenticated;
grant insert, update on table public.students to authenticated;
grant insert, update on table public.guardians to authenticated;
grant insert, update on table public.student_guardians to authenticated;
grant delete on table public.students to authenticated;

create policy "profiles self or orientadora"
on public.profiles
for select
using (id = auth.uid() or public.current_profile_role() = 'orientadora');

create policy "orientadora can register profiles"
on public.profiles
for insert
with check (public.current_profile_role() = 'orientadora');

create policy "orientadora can update profiles"
on public.profiles
for update
using (public.current_profile_role() = 'orientadora')
with check (public.current_profile_role() = 'orientadora');

create policy "specialties readable by authenticated users"
on public.specialties
for select
using (auth.role() = 'authenticated');

create policy "groups readable by linked users"
on public.student_groups
for select
using (
  public.can_manage_group(id)
  or id in (
    select s.group_id
    from public.students s
    join public.profiles p on p.email = s.email
    where p.id = auth.uid()
  )
  or exists (
    select 1
    from public.student_guardians sg
    join public.guardians g on g.id = sg.guardian_id
    join public.profiles p on p.email = g.email
    join public.students s on s.id = sg.student_id
    where s.group_id = student_groups.id
      and p.id = auth.uid()
  )
);

create policy "orientadora can create groups"
on public.student_groups
for insert
with check (public.current_profile_role() = 'orientadora');

create policy "orientadora can update groups"
on public.student_groups
for update
using (public.current_profile_role() = 'orientadora')
with check (public.current_profile_role() = 'orientadora');

create policy "teachers and orientadora can see assignments"
on public.group_teachers
for select
using (teacher_profile_id = auth.uid() or public.current_profile_role() = 'orientadora');

create policy "orientadora can assign teachers"
on public.group_teachers
for insert
with check (public.current_profile_role() = 'orientadora');

create policy "orientadora can update teacher assignments"
on public.group_teachers
for update
using (public.current_profile_role() = 'orientadora')
with check (public.current_profile_role() = 'orientadora');

create policy "students visible by ownership"
on public.students
for select
using (
  public.can_manage_group(group_id)
  or email = (
    select p.email
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "students insert by orientadora or group teacher"
on public.students
for insert
with check (
  public.current_profile_role() = 'orientadora'
  or public.can_manage_group(group_id)
);

create policy "students update by orientadora or group teacher"
on public.students
for update
using (
  public.current_profile_role() = 'orientadora'
  or public.can_manage_group(group_id)
)
with check (
  public.current_profile_role() = 'orientadora'
  or public.can_manage_group(group_id)
);

create policy "students delete by orientadora"
on public.students
for delete
using (public.current_profile_role() = 'orientadora');

create policy "guardians can view linked students"
on public.student_guardians
for select
using (
  public.current_profile_role() = 'orientadora'
  or student_id in (
    select s.id
    from public.students s
    where s.group_id in (
      select gt.group_id
      from public.group_teachers gt
      where gt.teacher_profile_id = auth.uid()
    )
  )
);

create policy "student guardian links insert by staff"
on public.student_guardians
for insert
with check (
  public.current_profile_role() = 'orientadora'
  or exists (
    select 1
    from public.students s
    where s.id = student_guardians.student_id
      and public.can_manage_group(s.group_id)
  )
);

create policy "student guardian links update by staff"
on public.student_guardians
for update
using (
  public.current_profile_role() = 'orientadora'
  or exists (
    select 1
    from public.students s
    where s.id = student_guardians.student_id
      and public.can_manage_group(s.group_id)
  )
)
with check (
  public.current_profile_role() = 'orientadora'
  or exists (
    select 1
    from public.students s
    where s.id = student_guardians.student_id
      and public.can_manage_group(s.group_id)
  )
);

create policy "guardians self or orientadora"
on public.guardians
for select
using (
  public.current_profile_role() = 'orientadora'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.email = guardians.email
  )
);

create policy "guardians insert by staff"
on public.guardians
for insert
with check (
  public.current_profile_role() in ('orientadora', 'profesor')
);

create policy "guardians update by staff"
on public.guardians
for update
using (
  public.current_profile_role() in ('orientadora', 'profesor')
)
with check (
  public.current_profile_role() in ('orientadora', 'profesor')
);

create policy "stages readable by authenticated users"
on public.stages
for select
using (auth.role() = 'authenticated');

create policy "skills readable by authenticated users"
on public.skills
for select
using (auth.role() = 'authenticated');

create policy "rubrics readable by authenticated users"
on public.rubrics
for select
using (auth.role() = 'authenticated');

create policy "evaluation read access by role"
on public.evaluations
for select
using (
  public.can_manage_group(group_id)
  or student_id in (
    select s.id
    from public.students s
    join public.profiles p on p.email = s.email
    where p.id = auth.uid()
  )
  or exists (
    select 1
    from public.student_guardians sg
    join public.guardians g on g.id = sg.guardian_id
    join public.profiles p on p.email = g.email
    where sg.student_id = evaluations.student_id
      and p.id = auth.uid()
  )
);

create policy "evaluation insert by assigned teacher"
on public.evaluations
for insert
with check (
  public.can_manage_group(group_id)
  and evaluator_profile_id = auth.uid()
);

create policy "evaluation update by assigned teacher while editable"
on public.evaluations
for update
using (public.can_manage_group(group_id))
with check (
  public.can_manage_group(group_id)
  and status <> 'locked'
);

create policy "score read mirrors evaluation read"
on public.evaluation_scores
for select
using (
  exists (
    select 1 from public.evaluations e
    where e.id = evaluation_scores.evaluation_id
      and (
        public.can_manage_group(e.group_id)
        or e.student_id in (
          select s.id
          from public.students s
          join public.profiles p on p.email = s.email
          where p.id = auth.uid()
        )
        or exists (
          select 1
          from public.student_guardians sg
          join public.guardians g on g.id = sg.guardian_id
          join public.profiles p on p.email = g.email
          where sg.student_id = e.student_id
            and p.id = auth.uid()
        )
      )
  )
);

create policy "score insert while evaluation editable"
on public.evaluation_scores
for insert
with check (public.evaluation_is_editable(evaluation_id));

create policy "score update while evaluation editable"
on public.evaluation_scores
for update
using (public.evaluation_is_editable(evaluation_id))
with check (public.evaluation_is_editable(evaluation_id));

create policy "ai feedback read mirrors student access"
on public.ai_feedback
for select
using (
  exists (
    select 1
    from public.students s
    where s.id = ai_feedback.student_id
      and (
        public.can_manage_group(s.group_id)
        or s.email = (
          select p.email
          from public.profiles p
          where p.id = auth.uid()
        )
        or exists (
          select 1
          from public.student_guardians sg
          join public.guardians g on g.id = sg.guardian_id
          join public.profiles p on p.email = g.email
          where sg.student_id = s.id
            and p.id = auth.uid()
        )
      )
  )
);

create policy "ai feedback write by assigned staff"
on public.ai_feedback
for insert
with check (
  exists (
    select 1
    from public.students s
    where s.id = ai_feedback.student_id
      and public.can_manage_group(s.group_id)
  )
);

create policy "ai feedback update by assigned staff"
on public.ai_feedback
for update
using (
  exists (
    select 1
    from public.students s
    where s.id = ai_feedback.student_id
      and public.can_manage_group(s.group_id)
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = ai_feedback.student_id
      and public.can_manage_group(s.group_id)
  )
);

create policy "notification queue by orientadora only"
on public.notification_queue
for all
using (public.current_profile_role() = 'orientadora')
with check (public.current_profile_role() = 'orientadora');

create index if not exists idx_students_group_id on public.students (group_id);
create index if not exists idx_students_specialty_id on public.students (specialty_id);
create index if not exists idx_group_teachers_group_id on public.group_teachers (group_id);
create index if not exists idx_skills_specialty_id on public.skills (specialty_id);
create index if not exists idx_evaluations_stage_group on public.evaluations (stage_id, group_id);
create index if not exists idx_ai_feedback_student_stage on public.ai_feedback (student_id, stage_id);
create index if not exists idx_notification_queue_status on public.notification_queue (delivery_status);

drop trigger if exists lock_evaluations_before_update on public.evaluations;
create trigger lock_evaluations_before_update
before update on public.evaluations
for each row execute function public.prevent_locked_changes();

drop trigger if exists lock_scores_before_update on public.evaluation_scores;
create trigger lock_scores_before_update
before update on public.evaluation_scores
for each row execute function public.prevent_locked_changes();

-- Seed base recomendado
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
