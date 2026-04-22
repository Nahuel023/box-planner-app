/* ════════════════════════════════════════════════════════════
   BOX PLANNER — SCHEMA V2
   Ejecutar en Supabase → SQL Editor → New Query → Run
   IMPORTANTE: Ejecutar después de supabase-schema.sql (v1)
   ════════════════════════════════════════════════════════════ */

-- ── Ejercicios (fuente de verdad global) ──────────────────
create table if not exists bp_ejercicios (
  id                  text        primary key,
  nombre              text        not null,
  disciplina          text        not null,   -- musculacion | crossfit | oly | funcional
  patron_movimiento   text        default '',
  tipo                text        default '',  -- hipertrofia | fuerza | cardio | movilidad | olimpico | skill
  musculo_principal   text        default '',
  musculo_secundario  text[]      default '{}',
  equipamiento        text[]      default '{}',
  nivel               text        default 'principiante',
  es_bilateral        boolean     default true,
  dificultad_tecnica  integer     default 1,
  contraindicado_en   text[]      default '{}',  -- zonas corporales con restricción
  activo              boolean     default true,
  created_by          text        default 'system',
  created_at          timestamptz default now()
);

-- ── Ejercicios por día en rutinas normalizadas ────────────
-- Complementa bp_rutinas (que sigue en uso para custom JSONB)
-- Esta tabla permite referenciar ejercicios reales por ID
create table if not exists bp_rutinas_ejercicios (
  id            bigserial   primary key,
  rutina_id     text        not null,   -- references bp_rutinas(id)
  ejercicio_id  text        not null,   -- references bp_ejercicios(id)
  disciplina    text        default '', -- copia desnormalizada para filtrar rápido
  dia           integer     not null,
  orden         integer     default 1,
  series        integer     default 3,
  reps          text        default '',
  descanso_seg  integer     default 90,
  notas         text        default '',
  created_at    timestamptz default now()
);

-- ── Lesiones ──────────────────────────────────────────────
create table if not exists bp_lesiones (
  id              bigserial   primary key,
  pin             text        not null,
  zona_corporal   text        not null,   -- rodilla | lumbar | hombro | tobillo | muneca | cuello | cadera | otro
  tipo_lesion     text        default '',  -- tendinitis | desgarro | contractura | esguince | fractura | otro
  estado          text        default 'activa',  -- activa | en_recuperacion | resuelta
  gravedad        text        default 'leve',    -- leve | moderada | grave
  restricciones   text[]      default '{}',      -- musculos/zonas a evitar (match con contraindicado_en)
  fecha_inicio    date        default current_date,
  fecha_fin       date,
  apto_entrenar   boolean     default true,
  notas_docente   text        default '',
  created_at      timestamptz default now()
);

-- ── Seguimiento diario de lesiones (carga el alumno) ─────
create table if not exists bp_lesion_seguimiento (
  id              bigserial   primary key,
  lesion_id       integer     not null,   -- references bp_lesiones(id)
  pin             text        not null,
  fecha           date        not null default current_date,
  dolor           integer     check (dolor between 0 and 10),
  rigidez         integer     check (rigidez between 0 and 10),
  inflamacion     integer     check (inflamacion between 0 and 10),
  sensacion_gral  integer     check (sensacion_gral between 0 and 10),
  observaciones   text        default '',
  created_at      timestamptz default now(),
  unique (lesion_id, fecha)   -- una entrada por lesión por día
);

-- ── RLS: acceso con anon key (mismo patrón que v1) ────────
alter table bp_ejercicios          enable row level security;
alter table bp_rutinas_ejercicios  enable row level security;
alter table bp_lesiones            enable row level security;
alter table bp_lesion_seguimiento  enable row level security;

create policy "allow all" on bp_ejercicios          for all using (true) with check (true);
create policy "allow all" on bp_rutinas_ejercicios  for all using (true) with check (true);
create policy "allow all" on bp_lesiones            for all using (true) with check (true);
create policy "allow all" on bp_lesion_seguimiento  for all using (true) with check (true);

-- ── Índices para performance ───────────────────────────────
create index if not exists idx_ejercicios_disciplina on bp_ejercicios(disciplina);
create index if not exists idx_ejercicios_activo     on bp_ejercicios(activo);
create index if not exists idx_lesiones_pin          on bp_lesiones(pin);
create index if not exists idx_lesiones_estado       on bp_lesiones(estado);
create index if not exists idx_seguimiento_lesion    on bp_lesion_seguimiento(lesion_id);
create index if not exists idx_seguimiento_pin       on bp_lesion_seguimiento(pin);
create index if not exists idx_rutinas_ej_rutina     on bp_rutinas_ejercicios(rutina_id);
