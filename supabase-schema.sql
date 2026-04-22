/* ════════════════════════════════════════════════════════════
   BOX PLANNER — SCHEMA SUPABASE
   ────────────────────────────────────────────────────────────
   Ejecutar en Supabase → SQL Editor → New Query → Run
   ════════════════════════════════════════════════════════════ */

-- Usuarios registrados (alumnos y docentes)
create table if not exists bp_usuarios (
  pin              text        primary key,
  nombre           text        not null,
  email            text        default '',
  fecha_nacimiento text        default '',
  objetivo         text        default '',
  rol              text        default 'alumno',
  disciplinas      text[]      default '{}',
  dias             integer     default 3,
  estado           text        default 'pendiente',
  fecha_registro   date        default current_date
);

-- Rutinas personalizadas creadas por docentes
create table if not exists bp_rutinas (
  id           text        primary key,
  nombre       text        not null,
  disciplina_id text       default '',
  nivel        text        default '',
  dias         jsonb       default '[]',
  creado_por   text        default '',
  created_at   timestamptz default now()
);

-- Historial de asignaciones de rutinas por alumno
create table if not exists bp_asignaciones (
  id               bigserial   primary key,
  pin              text        not null,
  rutina_id        text,
  fecha_asignacion date        default current_date,
  vista_por_alumno boolean     default false,
  created_at       timestamptz default now()
);

-- Métricas de rendimiento registradas por alumnos
create table if not exists bp_metricas (
  id           bigserial   primary key,
  alumno_id    text        not null,
  ejercicio_id text        not null,
  valor        numeric     not null,
  tipo         text        not null,
  fecha        date        not null,
  notas        text        default '',
  estado       text        default '',
  created_at   timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────
-- Permitir acceso con anon key (MVP — sin auth propia de Supabase)
alter table bp_usuarios     enable row level security;
alter table bp_rutinas      enable row level security;
alter table bp_asignaciones enable row level security;
alter table bp_metricas     enable row level security;

create policy "allow all" on bp_usuarios     for all using (true) with check (true);
create policy "allow all" on bp_rutinas      for all using (true) with check (true);
create policy "allow all" on bp_asignaciones for all using (true) with check (true);
create policy "allow all" on bp_metricas     for all using (true) with check (true);
