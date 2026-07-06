-- =============================================================================
-- Ventas: Pipeline + Mi Día — esquema optimizado
-- =============================================================================
-- Objetivo: consultas ligeras en "Mi Día" (tareas del día, SLA, fidelización)
-- sin full-scan. Índices parciales en fechas de vencimiento y estado pendiente.
--
-- Roles JWT esperados (user_role en app_metadata o user_metadata):
--   'comercial'  → solo filas donde id_asesor = auth.uid()
--   'supervisor' → lectura/escritura global (jefe comercial / superadmin)
--
-- Integración brownfield: si ya existen prospectos / tareas_ventas / actividades_ventas
-- del ERP, este script crea tablas canónicas nuevas. Mapeo legacy en comentarios.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Tipos enumerados (estados acotados → índices y validación barata)
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.estado_pipeline as enum (
    'nuevo',
    'contactado',
    'cualificado',
    'propuesta',
    'pendiente_firma',
    'cerrado',
    'perdido'
  );
exception when duplicate_object then null;
end $$;

comment on type public.estado_pipeline is
  'Pipeline comercial. Legacy: prospecto_nuevo→nuevo, propuesta_enviada→propuesta, activado→cerrado, descartado→perdido';

do $$ begin
  create type public.tarea_accionable_tipo as enum (
    'llamar_firma',           -- "Llamar para firma"
    'seguimiento_propuesta',  -- "Seguimiento propuesta"
    'fidelizacion'            -- "Fidelización"
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tarea_accionable_estado as enum ('pendiente', 'completada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fidelizacion_frecuencia_meses as enum ('1', '2', '3');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers RLS (JWT user_role + compatibilidad con roles ERP existentes)
-- ---------------------------------------------------------------------------

create or replace function private.jwt_user_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(coalesce(
    auth.jwt() ->> 'user_role',
    auth.jwt() -> 'app_metadata' ->> 'user_role',
    auth.jwt() -> 'user_metadata' ->> 'user_role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  ));
$$;

comment on function private.jwt_user_role() is
  'Lee user_role del JWT. Valores: comercial | supervisor (o jefe_comercial / superadmin legacy).';

create or replace function private.is_ventas_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.jwt_user_role() in (
    'supervisor',
    'jefe_comercial',
    'superadmin'
  );
$$;

create or replace function private.is_ventas_comercial()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.jwt_user_role() = 'comercial';
$$;

-- ---------------------------------------------------------------------------
-- prospectos
-- ---------------------------------------------------------------------------
-- Mi Día y Pipeline filtran casi siempre por id_asesor + fechas (SLA / caducidad).
-- Separar timestamps indexables evita parsear JSON metadata en cada request.

create table if not exists public.prospectos (
  id uuid primary key default gen_random_uuid(),
  id_asesor uuid not null references auth.users (id) on delete restrict,
  nombre text not null,
  empresa text,
  estado_pipeline public.estado_pipeline not null default 'nuevo',
  sla_vencimiento timestamptz,
  caducidad_oferta timestamptz,
  telefono text,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospectos_nombre_not_empty check (char_length(trim(nombre)) > 0)
);

comment on table public.prospectos is
  'Oportunidades del pipeline. id_asesor = auth.uid() del comercial asignado.';
comment on column public.prospectos.sla_vencimiento is
  'Límite SLA de la fase actual. Mi Día: WHERE sla_vencimiento <= now() AND estado activo.';
comment on column public.prospectos.caducidad_oferta is
  'Caducidad de propuesta comercial. Alertas antes de perder la oferta.';

-- Pipeline: listado por asesor + estado (kanban por columna)
create index if not exists idx_prospectos_asesor_estado
  on public.prospectos (id_asesor, estado_pipeline, updated_at desc);

-- Mi Día: prospectos con SLA vencido o próximo (índice parcial = menos páginas, más selectivo)
create index if not exists idx_prospectos_sla_vencimiento_mi_dia
  on public.prospectos (id_asesor, sla_vencimiento)
  where sla_vencimiento is not null
    and estado_pipeline not in ('cerrado', 'perdido');

-- Mi Día / alertas: ofertas que caducan pronto
create index if not exists idx_prospectos_caducidad_oferta
  on public.prospectos (id_asesor, caducidad_oferta)
  where caducidad_oferta is not null
    and estado_pipeline in ('propuesta', 'pendiente_firma');

-- ---------------------------------------------------------------------------
-- historial_interacciones (chat / notas de la tarjeta)
-- ---------------------------------------------------------------------------
-- Carga típica: últimos N mensajes de UN prospecto → índice (prospecto_id, created_at).

create table if not exists public.historial_interacciones (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  id_autor uuid not null references auth.users (id) on delete restrict,
  nota text not null,
  created_at timestamptz not null default now(),
  constraint historial_nota_not_empty check (char_length(trim(nota)) > 0)
);

comment on table public.historial_interacciones is
  'Comentarios y notas del prospecto (timeline tipo chat). Solo INSERT + SELECT.';

-- Chat: ORDER BY created_at DESC LIMIT 50 sin sort en heap
create index if not exists idx_historial_prospecto_reciente
  on public.historial_interacciones (prospecto_id, created_at desc);

-- ---------------------------------------------------------------------------
-- tareas_accionables (Mi Día — cola de trabajo)
-- ---------------------------------------------------------------------------
-- Consulta Mi Día: tareas pendientes del asesor ordenadas por fecha_vencimiento.
-- Índice parcial WHERE estado = pendiente reduce tamaño ~50% vs índice completo.

create table if not exists public.tareas_accionables (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  id_asesor uuid not null references auth.users (id) on delete restrict,
  tipo public.tarea_accionable_tipo not null,
  estado public.tarea_accionable_estado not null default 'pendiente',
  fecha_vencimiento timestamptz not null,
  titulo text,
  notas text,
  completada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tareas_completada_coherent check (
    (estado = 'completada' and completada_at is not null)
    or (estado = 'pendiente' and completada_at is null)
  )
);

comment on table public.tareas_accionables is
  'Tareas del comercial. Mi Día: pendientes con fecha_vencimiento <= fin de día.';

-- ★ Índice crítico Mi Día: "mis tareas pendientes por vencimiento"
create index if not exists idx_tareas_accionables_mi_dia
  on public.tareas_accionables (id_asesor, fecha_vencimiento)
  where estado = 'pendiente';

-- Lookup por prospecto (ficha / quick wins)
create index if not exists idx_tareas_accionables_prospecto
  on public.tareas_accionables (prospecto_id, estado, fecha_vencimiento);

-- ---------------------------------------------------------------------------
-- fidelizacion_clientes (post-activación ERP)
-- ---------------------------------------------------------------------------
-- Solo aplica cuando prospecto está en cerrado (contrato activado en ERP).
-- Mi Día: proximo_contacto <= hoy para recordatorios de fidelización.

create table if not exists public.fidelizacion_clientes (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null unique references public.prospectos (id) on delete cascade,
  id_asesor uuid not null references auth.users (id) on delete restrict,
  frecuencia_meses public.fidelizacion_frecuencia_meses not null default '3',
  proximo_contacto timestamptz not null,
  ultimo_contacto timestamptz,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fidelizacion_clientes is
  'Plan de fidelización tras activación. 1 registro por prospecto cerrado/activado.';

-- ★ Índice Mi Día: contactos de fidelización pendientes por asesor
create index if not exists idx_fidelizacion_proximo_contacto_mi_dia
  on public.fidelizacion_clientes (id_asesor, proximo_contacto)
  where activo = true;

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_prospectos_updated_at on public.prospectos;
create trigger trg_prospectos_updated_at
  before update on public.prospectos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tareas_accionables_updated_at on public.tareas_accionables;
create trigger trg_tareas_accionables_updated_at
  before update on public.tareas_accionables
  for each row execute function public.set_updated_at();

drop trigger if exists trg_fidelizacion_updated_at on public.fidelizacion_clientes;
create trigger trg_fidelizacion_updated_at
  before update on public.fidelizacion_clientes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.prospectos enable row level security;
alter table public.historial_interacciones enable row level security;
alter table public.tareas_accionables enable row level security;
alter table public.fidelizacion_clientes enable row level security;

-- prospectos
drop policy if exists prospectos_select on public.prospectos;
create policy prospectos_select on public.prospectos
  for select to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists prospectos_insert on public.prospectos;
create policy prospectos_insert on public.prospectos
  for insert to authenticated
  with check (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists prospectos_update on public.prospectos;
create policy prospectos_update on public.prospectos
  for update to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  )
  with check (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists prospectos_delete on public.prospectos;
create policy prospectos_delete on public.prospectos
  for delete to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

-- historial_interacciones (lectura si puedes ver el prospecto; insert como autor)
drop policy if exists historial_select on public.historial_interacciones;
create policy historial_select on public.historial_interacciones
  for select to authenticated
  using (
    exists (
      select 1 from public.prospectos p
      where p.id = prospecto_id
        and (private.is_ventas_supervisor() or p.id_asesor = auth.uid())
    )
  );

drop policy if exists historial_insert on public.historial_interacciones;
create policy historial_insert on public.historial_interacciones
  for insert to authenticated
  with check (
    id_autor = auth.uid()
    and exists (
      select 1 from public.prospectos p
      where p.id = prospecto_id
        and (private.is_ventas_supervisor() or p.id_asesor = auth.uid())
    )
  );

-- tareas_accionables
drop policy if exists tareas_select on public.tareas_accionables;
create policy tareas_select on public.tareas_accionables
  for select to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists tareas_insert on public.tareas_accionables;
create policy tareas_insert on public.tareas_accionables
  for insert to authenticated
  with check (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists tareas_update on public.tareas_accionables;
create policy tareas_update on public.tareas_accionables
  for update to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  )
  with check (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists tareas_delete on public.tareas_accionables;
create policy tareas_delete on public.tareas_accionables
  for delete to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

-- fidelizacion_clientes
drop policy if exists fidelizacion_select on public.fidelizacion_clientes;
create policy fidelizacion_select on public.fidelizacion_clientes
  for select to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists fidelizacion_insert on public.fidelizacion_clientes;
create policy fidelizacion_insert on public.fidelizacion_clientes
  for insert to authenticated
  with check (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists fidelizacion_update on public.fidelizacion_clientes;
create policy fidelizacion_update on public.fidelizacion_clientes
  for update to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  )
  with check (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

drop policy if exists fidelizacion_delete on public.fidelizacion_clientes;
create policy fidelizacion_delete on public.fidelizacion_clientes
  for delete to authenticated
  using (
    private.is_ventas_supervisor()
    or id_asesor = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Consultas de referencia Mi Día (no ejecutar en migración — solo documentación)
-- ---------------------------------------------------------------------------
--
-- 1) Tareas pendientes hoy y vencidas:
--    SELECT * FROM tareas_accionables
--    WHERE id_asesor = auth.uid()
--      AND estado = 'pendiente'
--      AND fecha_vencimiento < now() + interval '1 day'
--    ORDER BY fecha_vencimiento
--    → usa idx_tareas_accionables_mi_dia
--
-- 2) Prospectos SLA crítico:
--    SELECT * FROM prospectos
--    WHERE id_asesor = auth.uid()
--      AND sla_vencimiento <= now()
--      AND estado_pipeline NOT IN ('cerrado','perdido')
--    ORDER BY sla_vencimiento
--    → usa idx_prospectos_sla_vencimiento_mi_dia
--
-- 3) Fidelización pendiente:
--    SELECT f.*, p.nombre FROM fidelizacion_clientes f
--    JOIN prospectos p ON p.id = f.prospecto_id
--    WHERE f.id_asesor = auth.uid()
--      AND f.activo AND f.proximo_contacto <= now()
--    ORDER BY f.proximo_contacto
--    → usa idx_fidelizacion_proximo_contacto_mi_dia
--
-- 4) Chat de tarjeta:
--    SELECT * FROM historial_interacciones
--    WHERE prospecto_id = $1
--    ORDER BY created_at DESC LIMIT 50
--    → usa idx_historial_prospecto_reciente

commit;
