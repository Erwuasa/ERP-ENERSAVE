-- Alegaciones sobre liquidaciones (ERP) — preparación Fase 4
-- Solo texto en mensajes (jsonb); adjuntos binarios/dataUrl NO se persisten.
-- Requiere: public.settlements, public.contratos_equipo, public.erp_comerciales

begin;

create table if not exists public.alegaciones (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid references public.settlements(id),
  contrato_id uuid references public.contratos_equipo(id),
  comercial_id uuid references public.user_profiles(id),
  estado text not null default 'abierta' check (estado in ('abierta', 'en_revision', 'resuelta')),
  mensajes jsonb not null default '[]'::jsonb,
  -- mensajes.archivosAdjuntos con sus dataUrl NO se guardan aquí, solo texto,
  -- autor, fecha y numArchivosAdjuntos por cada mensaje. Los archivos reales
  -- quedan solo en memoria del navegador durante esa sesión.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alegaciones enable row level security;

drop policy if exists alegaciones_select on public.alegaciones;
create policy alegaciones_select on public.alegaciones
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

drop policy if exists alegaciones_insert on public.alegaciones;
create policy alegaciones_insert on public.alegaciones
  for insert to authenticated
  with check (
    comercial_id = private.current_comercial_id()
    or private.current_role() in ('superadmin', 'tramitacion')
  );

drop policy if exists alegaciones_update on public.alegaciones;
create policy alegaciones_update on public.alegaciones
  for update to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );

commit;
