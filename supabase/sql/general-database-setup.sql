-- ============================================================
-- Base de Datos — prospección comercial (ERP EnerSave)
-- Ejecutar en Supabase SQL Editor (proyecto remoto).
--
-- Requisitos previos (migraciones ya aplicadas en el proyecto):
--   • public.erp_comerciales
--   • private.current_role()  (RLS ventas / contratos)
--   • private.set_updated_at() (opcional; se crea abajo si falta)
-- ============================================================

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

begin;

create table if not exists public.general_database_leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sede text,
  numero_adm_seg_social text,
  numero_empleados integer,
  cnae text,
  codigo_postal text,
  localidad text,
  provincia text,
  telefono text,
  direccion_web text,
  codigo_ine text,
  descripcion_actividad text,
  segment text not null default 'pyme'
    check (segment in ('residencial', 'pyme', 'comunidades')),
  source text not null default 'base'
    check (source in ('campana', 'web', 'base')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists general_database_leads_segment_idx
  on public.general_database_leads (segment);
create index if not exists general_database_leads_source_idx
  on public.general_database_leads (source);
create index if not exists general_database_leads_provincia_idx
  on public.general_database_leads (provincia);
create index if not exists general_database_leads_localidad_idx
  on public.general_database_leads (localidad);
create index if not exists general_database_leads_cnae_idx
  on public.general_database_leads (cnae);
create index if not exists general_database_leads_empleados_idx
  on public.general_database_leads (numero_empleados);
create index if not exists general_database_leads_nombre_idx
  on public.general_database_leads (nombre);

comment on table public.general_database_leads is
  'Base de Datos de prospección (residencial, PYME, comunidades). Sin export CSV para comerciales.';

drop trigger if exists trg_general_database_leads_updated_at on public.general_database_leads;
create trigger trg_general_database_leads_updated_at
  before update on public.general_database_leads
  for each row
  execute function private.set_updated_at();

alter table public.general_database_leads enable row level security;

create or replace function private.is_general_database_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.current_role() in ('superadmin', 'tramitacion');
$$;

drop policy if exists general_database_leads_select on public.general_database_leads;
create policy general_database_leads_select on public.general_database_leads
  for select to authenticated
  using (
    private.current_role() in (
      'superadmin', 'tramitacion', 'comercial', 'jefe_comercial'
    )
  );

drop policy if exists general_database_leads_insert on public.general_database_leads;
create policy general_database_leads_insert on public.general_database_leads
  for insert to authenticated
  with check (private.is_general_database_manager());

drop policy if exists general_database_leads_update on public.general_database_leads;
create policy general_database_leads_update on public.general_database_leads
  for update to authenticated
  using (private.is_general_database_manager())
  with check (private.is_general_database_manager());

drop policy if exists general_database_leads_delete on public.general_database_leads;
create policy general_database_leads_delete on public.general_database_leads
  for delete to authenticated
  using (private.is_general_database_manager());

-- Demo seed (idempotente)
insert into public.general_database_leads (
  id, nombre, sede, numero_adm_seg_social, numero_empleados, cnae,
  codigo_postal, localidad, provincia, telefono, direccion_web, codigo_ine,
  descripcion_actividad, segment, source, created_at
)
values
  (
    'aaaaaaaa-0001-4001-8001-000000000001',
    'VITALCENTRO MADRID RESIDENCIAS Y CENTROS',
    'Ctro. de Trabajo: Urban. Prado Co, 1-3',
    '28124241234', 88, '8710', '28100', 'Alcobendas', 'MADRID (MADRID)',
    '916616606', 'www.vitalcentro.com', '280060001',
    'Asistencia en establecimientos residenciales con cuidados sanitarios',
    'pyme', 'campana', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000002',
    'Residencia Los Olivos',
    'Av. de la Constitución, 12',
    null, 24, '8710', '28045', 'Madrid', 'MADRID (MADRID)',
    '914021122', 'www.residencialosolivos.es', null,
    'Residencia de mayores con servicios integrados',
    'comunidades', 'web', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000003',
    'Comunidad Propietarios Edificio Gran Vía 45',
    'Gran Vía, 45',
    null, 0, null, '28013', 'Madrid', 'MADRID (MADRID)',
    '612345678', null, null, null,
    'comunidades', 'web', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000004',
    'Panadería Artesana López',
    'C/ Mayor, 8',
    null, 6, '1071', '08002', 'Barcelona', 'BARCELONA (BARCELONA)',
    '933012345', null, null, null,
    'pyme', 'campana', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000005',
    'Taller Mecánico Viesgo Norte',
    'Polígono Industrial Norte, Nave 4',
    null, 15, '4520', '11011', 'Cádiz', 'CÁDIZ (CÁDIZ)',
    '956789012', 'www.tallerviesgo.es', null, null,
    'pyme', 'base', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000006',
    'Ana García Pérez',
    'C/ Luna, 3, 4B',
    null, 0, null, '46001', 'Valencia', 'VALENCIA (VALENCIA)',
    '644555666', null, null, null,
    'residencial', 'web', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000007',
    'Clínica Dental Nova',
    'Av. del Puerto, 22',
    null, 12, '8623', '46011', 'Valencia', 'VALENCIA (VALENCIA)',
    '963111222', 'www.clinicanova.es', null, null,
    'pyme', 'campana', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000008',
    'Comunidad Vecinos Calle Sierpes 9',
    null, null, 0, null, '41004', 'Sevilla', 'SEVILLA (SEVILLA)',
    null, null, null, null,
    'comunidades', 'base', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000009',
    'Gimnasio FitPro Center',
    'Centro Comercial Norte',
    null, 9, '9313', '41020', 'Sevilla', 'SEVILLA (SEVILLA)',
    '955666777', 'fitpro.es', null, null,
    'pyme', 'web', '2026-08-01'::timestamptz
  ),
  (
    'aaaaaaaa-0001-4001-8001-000000000010',
    'Carlos Martín Ruiz',
    null, null, 0, null, '28028', 'Madrid', 'MADRID (MADRID)',
    null, null, null, null,
    'residencial', 'base', '2026-08-01'::timestamptz
  )
on conflict (id) do nothing;

commit;

-- Tras ejecutar: recarga el ERP. La tabla public.general_database_leads quedará disponible.
