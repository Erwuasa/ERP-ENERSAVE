-- Ventas core tables: prospectos pipeline, actividades timeline, tareas queue
-- DATA-01: snake_case columns; text comercial_id matches contratos_equipo

create table if not exists public.prospectos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  comercial_id text not null,
  comercial_name text not null,
  nombre text not null,
  telefono text,
  email text,
  nif text,
  fase text not null default 'prospecto_nuevo' check (
    fase in (
      'prospecto_nuevo',
      'contactado',
      'cualificado',
      'propuesta_enviada',
      'negociacion',
      'documentacion',
      'enviado',
      'cliente_activo',
      'recontactar',
      'descartado'
    )
  ),
  fase_changed_at timestamptz not null default now(),
  dias_en_fase integer not null default 0,
  motivo_descarte text,
  contrato_equipo_id uuid references public.contratos_equipo (id) on delete set null,
  cups text,
  tipo_suministro text check (tipo_suministro in ('luz', 'gas')),
  consumo_anual_kwh numeric,
  compania_actual text,
  vencimiento_permanencia date,
  tarifa_actual text,
  propuesta_compania text,
  propuesta_tarifa text,
  propuesta_notas text,
  direccion text,
  codigo_postal text,
  poblacion text,
  provincia text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists prospectos_comercial_id_idx on public.prospectos (comercial_id);
create index if not exists prospectos_fase_idx on public.prospectos (fase);
create index if not exists prospectos_comercial_fase_idx on public.prospectos (comercial_id, fase);
create index if not exists prospectos_contrato_equipo_id_idx on public.prospectos (contrato_equipo_id);

comment on table public.prospectos is 'Sales pipeline prospects — central ventas entity';
comment on column public.prospectos.contrato_equipo_id is 'FK set when prospect converts to contratos_equipo (Phase 7)';

create table if not exists public.actividades_ventas (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  comercial_id text not null,
  comercial_name text,
  tipo text not null check (
    tipo in (
      'llamada',
      'visita',
      'email',
      'whatsapp',
      'nota',
      'cambio_fase',
      'documento',
      'propuesta_enviada',
      'contrato_creado'
    )
  ),
  titulo text,
  descripcion text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists actividades_ventas_prospecto_id_idx on public.actividades_ventas (prospecto_id);
create index if not exists actividades_ventas_created_at_idx on public.actividades_ventas (prospecto_id, created_at desc);

comment on table public.actividades_ventas is 'Immutable sales activity timeline; cambio_fase rows inserted by DB trigger';

create table if not exists public.tareas_ventas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  comercial_id text not null,
  tipo text not null check (
    tipo in (
      'primer_contacto',
      'llamada_seguimiento',
      'enviar_propuesta',
      'recoger_documentacion',
      'verificar_alta',
      'recontacto_programado',
      'encuesta_satisfaccion'
    )
  ),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'completada', 'descartada')),
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  fecha_objetivo date,
  titulo text,
  notas text,
  completada_at timestamptz,
  origen_fase text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists tareas_ventas_comercial_estado_idx on public.tareas_ventas (comercial_id, estado);
create index if not exists tareas_ventas_comercial_fecha_idx on public.tareas_ventas (comercial_id, fecha_objetivo);
create index if not exists tareas_ventas_dedup_idx on public.tareas_ventas (prospecto_id, tipo, origen_fase);

comment on table public.tareas_ventas is 'Commercial task queue for Mi Día (Phase 5)';
comment on column public.tareas_ventas.origen_fase is 'Pipeline fase that spawned task — dedup key for quick-wins';
