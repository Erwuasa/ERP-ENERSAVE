-- AT CRM sync: clientes, contratos, liquidaciones, incidencias, catálogos, comparativas, emails

-- ---------- clientes ----------
alter table public.clientes
  add column if not exists at_client_id uuid,
  add column if not exists apellidos text,
  add column if not exists rgpd_accepted boolean not null default false,
  add column if not exists notas text,
  add column if not exists cups text,
  add column if not exists at_responsible_profile_id uuid,
  add column if not exists source text not null default 'manual',
  add column if not exists at_synced_at timestamptz,
  add column if not exists at_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clientes_source_check'
      and conrelid = 'public.clientes'::regclass
  ) then
    alter table public.clientes
      add constraint clientes_source_check check (source in ('manual', 'at'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clientes_at_client_id_unique'
      and conrelid = 'public.clientes'::regclass
  ) then
    alter table public.clientes
      add constraint clientes_at_client_id_unique unique (at_client_id);
  end if;
end $$;

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
    or source = 'at'
  );

-- ---------- contratos ----------
alter table public.contratos_equipo
  alter column comercial_id drop not null;

alter table public.contratos_equipo
  add column if not exists at_contract_id uuid,
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists at_rate_id uuid,
  add column if not exists tariff_id uuid references public.tariffs(id) on delete set null,
  add column if not exists at_marco_id text,
  add column if not exists at_comparison_id uuid,
  add column if not exists at_status text,
  add column if not exists source text not null default 'manual',
  add column if not exists at_synced_at timestamptz,
  add column if not exists at_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contratos_equipo_source_check'
      and conrelid = 'public.contratos_equipo'::regclass
  ) then
    alter table public.contratos_equipo
      add constraint contratos_equipo_source_check check (source in ('manual', 'at'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contratos_equipo_at_contract_id_unique'
      and conrelid = 'public.contratos_equipo'::regclass
  ) then
    alter table public.contratos_equipo
      add constraint contratos_equipo_at_contract_id_unique unique (at_contract_id);
  end if;
end $$;

drop policy if exists contratos_equipo_select on public.contratos_equipo;
create policy contratos_equipo_select on public.contratos_equipo
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
    or jefe_equipo = private.current_comercial_id()
    or source = 'at'
  );

-- ---------- settlements / liquidaciones ----------
alter table public.settlements
  alter column comercial_id drop not null;

alter table public.settlements
  add column if not exists at_liquidation_id uuid,
  add column if not exists company_payment_status text,
  add column if not exists collaborator_payment_status text,
  add column if not exists source text not null default 'manual',
  add column if not exists at_synced_at timestamptz,
  add column if not exists at_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_source_check'
      and conrelid = 'public.settlements'::regclass
  ) then
    alter table public.settlements
      add constraint settlements_source_check check (source in ('manual', 'at'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_at_liquidation_id_unique'
      and conrelid = 'public.settlements'::regclass
  ) then
    alter table public.settlements
      add constraint settlements_at_liquidation_id_unique unique (at_liquidation_id);
  end if;
end $$;

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
    or comercial_id in (select private.accessible_comercial_ids())
    or source = 'at'
  );

-- ---------- incidencias ----------
alter table public.incidencias
  add column if not exists at_incident_id uuid,
  add column if not exists source text not null default 'manual',
  add column if not exists at_synced_at timestamptz,
  add column if not exists at_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'incidencias_source_check'
      and conrelid = 'public.incidencias'::regclass
  ) then
    alter table public.incidencias
      add constraint incidencias_source_check check (source in ('manual', 'at'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'incidencias_at_incident_id_unique'
      and conrelid = 'public.incidencias'::regclass
  ) then
    alter table public.incidencias
      add constraint incidencias_at_incident_id_unique unique (at_incident_id);
  end if;
end $$;

drop policy if exists incidencias_select on public.incidencias;
create policy incidencias_select on public.incidencias
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or creado_por = private.current_comercial_id()
    or asignado_a = private.current_comercial_id()
    or source = 'at'
  );

-- ---------- catalogos restantes ----------
create table if not exists public.at_catalog_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  at_id text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  at_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, at_id)
);

alter table public.at_catalog_entries enable row level security;

drop policy if exists at_catalog_entries_select on public.at_catalog_entries;
create policy at_catalog_entries_select on public.at_catalog_entries
  for select to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion', 'comercial', 'jefe_comercial'));

-- ---------- comparativas AT ----------
create table if not exists public.at_comparisons (
  id uuid primary key default gen_random_uuid(),
  at_comparison_id uuid not null unique,
  name text not null,
  client_name text not null default '',
  cups text not null default '',
  access_tariff text not null default '2.0TD',
  client_type text,
  email text,
  phone text,
  province text,
  current_annual_expense numeric not null default 0,
  max_annual_savings numeric not null default 0,
  best_tariff_name text not null default '',
  signing_status text,
  source text not null default 'at',
  at_synced_at timestamptz,
  at_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.at_comparisons enable row level security;

drop policy if exists at_comparisons_select on public.at_comparisons;
create policy at_comparisons_select on public.at_comparisons
  for select to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion', 'comercial', 'jefe_comercial'));

-- ---------- avisos email AT ----------
create table if not exists public.at_email_logs (
  id uuid primary key default gen_random_uuid(),
  at_email_id text not null unique,
  contrato_id uuid references public.contratos_equipo(id) on delete set null,
  at_contract_id uuid,
  status text not null default 'unknown',
  to_email text,
  subject text,
  sent_at timestamptz,
  source text not null default 'at',
  at_synced_at timestamptz,
  at_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.at_email_logs enable row level security;

drop policy if exists at_email_logs_select on public.at_email_logs;
create policy at_email_logs_select on public.at_email_logs
  for select to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion', 'comercial', 'jefe_comercial'));

create index if not exists at_email_logs_contrato_idx on public.at_email_logs (contrato_id);
create index if not exists at_comparisons_cups_idx on public.at_comparisons (cups);
