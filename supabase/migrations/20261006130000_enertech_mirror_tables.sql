-- Enertech (aenergetic) API mirror. Every table is prefixed enertech_ and is independent from the AT data:
-- nothing here references or reuses providers / tariffs / contratos_equipo / clientes.
-- Rows are written only by the enertech-sync-* Edge Functions (service role).
--
-- Change tracking on every mirror table:
--   payload       full raw row as returned by the API (so unanticipated fields are never lost)
--   content_hash  sha-256 of the payload (stable key order)
--   actualizado_en  the API's own change marker, when the entity has one
--   first_seen_at / last_seen_at / changed_at / removed_at

-- ---------------------------------------------------------------------------
-- Switch: cron and scheduled syncs do nothing until a superadmin turns this on.
-- ---------------------------------------------------------------------------
alter table public.erp_settings
  add column if not exists enertech_sync_enabled boolean not null default false;

comment on column public.erp_settings.enertech_sync_enabled is
  'When false the enertech-sync-* functions skip mode=sync (explore and force=1 still work).';

grant update (enertech_sync_enabled) on public.erp_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Sync bookkeeping
-- ---------------------------------------------------------------------------
create table if not exists public.enertech_sync_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  mode text not null default 'sync',
  status text not null default 'running' check (status in ('running', 'ok', 'error', 'skipped')),
  triggered_by text,
  stats jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists enertech_sync_runs_job_idx
  on public.enertech_sync_runs (job, started_at desc);

create table if not exists public.enertech_sync_state (
  job text primary key,
  cursor text,
  updated_at timestamptz not null default now()
);

create table if not exists public.enertech_sync_locks (
  job text primary key,
  locked_at timestamptz not null default now()
);

create table if not exists public.enertech_catalog_changes (
  id bigint generated always as identity primary key,
  run_id uuid references public.enertech_sync_runs (id) on delete set null,
  entity text not null,
  entity_key text not null,
  change_type text not null check (change_type in ('new', 'updated', 'restored', 'removed')),
  previous_actualizado_en text,
  new_actualizado_en text,
  created_at timestamptz not null default now()
);

create index if not exists enertech_catalog_changes_entity_idx
  on public.enertech_catalog_changes (entity, created_at desc);

-- ---------------------------------------------------------------------------
-- Catalog mirrors
-- ---------------------------------------------------------------------------
create table if not exists public.enertech_comercializadoras (
  id integer primary key,
  nombre text,
  payload jsonb not null default '{}'::jsonb,
  content_hash text,
  actualizado_en text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  removed_at timestamptz
);

create table if not exists public.enertech_tarifas_acceso (
  id_rate integer primary key,
  nombre text,
  producto text,
  payload jsonb not null default '{}'::jsonb,
  content_hash text,
  actualizado_en text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  removed_at timestamptz
);

create table if not exists public.enertech_precios (
  clave text primary key,
  id integer,
  company_id integer,
  producto text,
  tipo text,
  payload jsonb not null default '{}'::jsonb,
  content_hash text,
  actualizado_en text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  removed_at timestamptz
);

create index if not exists enertech_precios_id_idx on public.enertech_precios (id);
create index if not exists enertech_precios_company_idx on public.enertech_precios (company_id);

create table if not exists public.enertech_comisiones (
  clave text primary key,
  id integer,
  company_id integer,
  producto text,
  tipo text,
  payload jsonb not null default '{}'::jsonb,
  content_hash text,
  actualizado_en text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  removed_at timestamptz
);

create index if not exists enertech_comisiones_id_idx on public.enertech_comisiones (id);
create index if not exists enertech_comisiones_company_idx on public.enertech_comisiones (company_id);

-- ---------------------------------------------------------------------------
-- Customer data mirrors (personal data: restricted below)
-- ---------------------------------------------------------------------------
create table if not exists public.enertech_clientes (
  id_customer integer primary key,
  nombre text,
  dni_cif text,
  email text,
  telefono text,
  rgpd boolean,
  fecha_alta text,
  payload jsonb not null default '{}'::jsonb,
  content_hash text,
  actualizado_en text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  removed_at timestamptz
);

create index if not exists enertech_clientes_dni_idx on public.enertech_clientes (dni_cif);

create table if not exists public.enertech_contratos (
  id_contract integer primary key,
  cups text,
  cliente_id integer,
  cliente_nombre text,
  compania text,
  producto text,
  estado_id integer,
  estado_nombre text,
  estado_final boolean,
  incidencia text,
  fecha_contrato text,
  fecha_alta text,
  fecha_actualizacion text,
  payload jsonb not null default '{}'::jsonb,
  content_hash text,
  actualizado_en text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  removed_at timestamptz
);

create index if not exists enertech_contratos_cups_idx on public.enertech_contratos (cups);
create index if not exists enertech_contratos_cliente_idx on public.enertech_contratos (cliente_id);
create index if not exists enertech_contratos_estado_idx on public.enertech_contratos (estado_id);

-- ---------------------------------------------------------------------------
-- RLS: nobody writes from the app (service role only).
-- Catalog readable by staff; customer data and bookkeeping by superadmin / tramitacion.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'enertech_comercializadoras', 'enertech_tarifas_acceso', 'enertech_precios', 'enertech_comisiones',
    'enertech_clientes', 'enertech_contratos',
    'enertech_sync_runs', 'enertech_sync_state', 'enertech_sync_locks', 'enertech_catalog_changes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;

  foreach t in array array[
    'enertech_comercializadoras', 'enertech_tarifas_acceso', 'enertech_precios', 'enertech_comisiones'
  ]
  loop
    execute format('grant select on table public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_staff', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.current_role() in (''superadmin'', ''tramitacion'', ''comercial'', ''jefe_comercial''))',
      t || '_select_staff', t
    );
  end loop;

  foreach t in array array[
    'enertech_clientes', 'enertech_contratos', 'enertech_sync_runs', 'enertech_catalog_changes'
  ]
  loop
    execute format('grant select on table public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_admin', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.current_role() in (''superadmin'', ''tramitacion''))',
      t || '_select_admin', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Lock so two runs of the same job never overlap (cron + manual call).
-- ---------------------------------------------------------------------------
create or replace function public.enertech_try_acquire_sync_lock(
  p_job text,
  p_stale_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  acquired boolean;
begin
  insert into public.enertech_sync_locks (job, locked_at)
  values (p_job, now())
  on conflict (job) do update
    set locked_at = excluded.locked_at
    where public.enertech_sync_locks.locked_at < now() - make_interval(secs => p_stale_seconds)
  returning true into acquired;

  return coalesce(acquired, false);
end;
$$;

create or replace function public.enertech_release_sync_lock(p_job text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.enertech_sync_locks where job = p_job;
$$;

revoke all on function public.enertech_try_acquire_sync_lock(text, integer) from public, anon, authenticated;
revoke all on function public.enertech_release_sync_lock(text) from public, anon, authenticated;
grant execute on function public.enertech_try_acquire_sync_lock(text, integer) to service_role;
grant execute on function public.enertech_release_sync_lock(text) to service_role;

-- ---------------------------------------------------------------------------
-- Cron. Auth = vault secret `enertech-sync-secret` (same value as the functions' ENERTECH_SYNC_SECRET).
-- Create it once in the SQL editor:
--   select vault.create_secret('<secret>', 'enertech-sync-secret', 'Bearer for enertech-sync-* cron');
-- Until erp_settings.enertech_sync_enabled is true every call is answered with `skipped`.
-- ---------------------------------------------------------------------------
create or replace function private.invoke_enertech_sync(p_function text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  req_id bigint;
  secret text;
begin
  if p_function not in (
    'enertech-sync-comercializadoras', 'enertech-sync-tarifas-acceso', 'enertech-sync-precios',
    'enertech-sync-comisiones', 'enertech-sync-clientes', 'enertech-sync-contratos'
  ) then
    raise exception 'invalid enertech sync function: %', p_function;
  end if;

  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'enertech-sync-secret'
  limit 1;

  if secret is null or btrim(secret) = '' then
    raise warning 'enertech sync skipped: vault secret enertech-sync-secret is missing';
    return null;
  end if;

  select net.http_post(
    url := 'https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/' || p_function || '?mode=sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := jsonb_build_object('mode', 'sync', 'source', 'cron'),
    timeout_milliseconds := 120000
  )
  into req_id;

  return req_id;
end;
$$;

revoke all on function private.invoke_enertech_sync(text) from public;
grant execute on function private.invoke_enertech_sync(text) to postgres;

do $$
declare
  job record;
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    raise notice 'pg_cron is not installed: enertech cron jobs were not scheduled';
    return;
  end if;

  for job in
    select jobid from cron.job where jobname like 'enertech-sync-%'
  loop
    perform cron.unschedule(job.jobid);
  end loop;

  -- Slow-moving reference data: once a day.
  perform cron.schedule('enertech-sync-comercializadoras', '0 3 * * *',
    $cmd$select private.invoke_enertech_sync('enertech-sync-comercializadoras')$cmd$);
  perform cron.schedule('enertech-sync-tarifas-acceso', '5 3 * * *',
    $cmd$select private.invoke_enertech_sync('enertech-sync-tarifas-acceso')$cmd$);

  -- Prices and commissions are loaded in batches (monthly per the API guide): every 6 hours is plenty.
  perform cron.schedule('enertech-sync-precios', '10 */6 * * *',
    $cmd$select private.invoke_enertech_sync('enertech-sync-precios')$cmd$);
  perform cron.schedule('enertech-sync-comisiones', '20 */6 * * *',
    $cmd$select private.invoke_enertech_sync('enertech-sync-comisiones')$cmd$);

  -- Customers: no change filter in the API, so a full pass each hour.
  perform cron.schedule('enertech-sync-clientes', '30 * * * *',
    $cmd$select private.invoke_enertech_sync('enertech-sync-clientes')$cmd$);

  -- Contracts: incremental by modificado_desde, so it can run often.
  perform cron.schedule('enertech-sync-contratos', '*/15 * * * *',
    $cmd$select private.invoke_enertech_sync('enertech-sync-contratos')$cmd$);
end $$;
