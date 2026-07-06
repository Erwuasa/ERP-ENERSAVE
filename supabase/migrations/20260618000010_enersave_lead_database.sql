-- Base de datos general EnerSave (leads B2B) — gestión superadmin / tramitación
-- Lectura para comerciales en módulo Ventas (importar al pipeline).

begin;

do $$ begin
  alter type public.user_role add value if not exists 'tramitacion';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.enersave_leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  empresa text,
  telefono text,
  email text,
  sector text,
  provincia text,
  codigo_postal text,
  cups text,
  consumo_anual_kwh numeric,
  compania_actual text,
  notas text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enersave_leads_sector_idx on public.enersave_leads (sector);
create index if not exists enersave_leads_provincia_idx on public.enersave_leads (provincia);
create index if not exists enersave_leads_nombre_idx on public.enersave_leads (nombre);

comment on table public.enersave_leads is
  'Base de datos comercial EnerSave. Import CSV/Excel y búsqueda para pipeline Ventas.';

alter table public.enersave_leads enable row level security;

create or replace function private.is_enersave_lead_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.jwt_user_role() in ('superadmin', 'tramitacion', 'supervisor', 'jefe_comercial');
$$;

drop policy if exists enersave_leads_select_ventas on public.enersave_leads;
create policy enersave_leads_select_ventas on public.enersave_leads
  for select to authenticated
  using (
    private.is_ventas_supervisor()
    or private.jwt_user_role() in ('comercial', 'tramitacion')
  );

drop policy if exists enersave_leads_insert_manager on public.enersave_leads;
create policy enersave_leads_insert_manager on public.enersave_leads
  for insert to authenticated
  with check (private.is_enersave_lead_manager());

drop policy if exists enersave_leads_update_manager on public.enersave_leads;
create policy enersave_leads_update_manager on public.enersave_leads
  for update to authenticated
  using (private.is_enersave_lead_manager())
  with check (private.is_enersave_lead_manager());

drop policy if exists enersave_leads_delete_manager on public.enersave_leads;
create policy enersave_leads_delete_manager on public.enersave_leads
  for delete to authenticated
  using (private.is_enersave_lead_manager());

-- Demo seed (idempotente)
insert into public.enersave_leads (id, nombre, empresa, telefono, email, sector, provincia, consumo_anual_kwh, compania_actual)
values
  ('11111111-1111-4111-8111-111111111101', 'Ferretería García', 'Ferretería García SL', '611222333', 'info@ferreteriagarcia.es', 'Retail', 'Madrid', 12000, 'Endesa'),
  ('11111111-1111-4111-8111-111111111102', 'Panadería López', 'Panadería López', '622333444', 'lopez@panaderia.es', 'Hostelería', 'Barcelona', 8500, 'Iberdrola'),
  ('11111111-1111-4111-8111-111111111103', 'Taller Viesgo', 'Taller Viesgo Norte', '633444555', 'taller@viesgo.es', 'Industrial', 'Cádiz', 42000, 'Naturgy'),
  ('11111111-1111-4111-8111-111111111104', 'Clínica Dental Nova', 'Clínica Nova', '644555666', 'admin@clinicanova.es', 'Sanidad', 'Valencia', 15000, 'Repsol'),
  ('11111111-1111-4111-8111-111111111105', 'Gimnasio FitPro', 'FitPro Center', '655666777', 'gerencia@fitpro.es', 'Deporte', 'Sevilla', 22000, 'TotalEnergies')
on conflict (id) do nothing;

commit;
