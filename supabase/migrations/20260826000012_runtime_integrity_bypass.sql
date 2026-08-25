-- Bypass manual del guardián de integridad runtime + historial de bloqueos
-- Requiere: public.erp_comerciales, private.current_comercial_id(), private.current_role()

begin;

alter table public.erp_comerciales
  add column if not exists integrity_guard_bypass boolean not null default false;

comment on column public.erp_comerciales.integrity_guard_bypass is
  'Si true, el guardián de integridad runtime no bloquea la sesión (concedido manualmente desde Supabase).';

create table if not exists public.runtime_integrity_blocks (
  id uuid primary key default gen_random_uuid(),
  comercial_id text not null references public.erp_comerciales (id) on delete cascade,
  findings jsonb not null default '[]'::jsonb,
  fingerprint text not null,
  blocked_at timestamptz not null default now(),
  cleared_at timestamptz,
  cleared_by text references public.erp_comerciales (id) on delete set null,
  admin_notes text
);

create index if not exists runtime_integrity_blocks_comercial_active_idx
  on public.runtime_integrity_blocks (comercial_id)
  where cleared_at is null;

create index if not exists runtime_integrity_blocks_blocked_at_idx
  on public.runtime_integrity_blocks (blocked_at desc);

comment on table public.runtime_integrity_blocks is
  'Registro de bloqueos por el guardián de integridad. Para desbloquear: integrity_guard_bypass=true y/o cleared_at en filas activas.';

alter table public.runtime_integrity_blocks enable row level security;

drop policy if exists runtime_integrity_blocks_select on public.runtime_integrity_blocks;
create policy runtime_integrity_blocks_select on public.runtime_integrity_blocks
  for select to authenticated
  using (
    private.current_role() = 'superadmin'
    or comercial_id = private.current_comercial_id()
  );

drop policy if exists runtime_integrity_blocks_insert on public.runtime_integrity_blocks;
create policy runtime_integrity_blocks_insert on public.runtime_integrity_blocks
  for insert to authenticated
  with check (comercial_id = private.current_comercial_id());

drop policy if exists runtime_integrity_blocks_update on public.runtime_integrity_blocks;
create policy runtime_integrity_blocks_update on public.runtime_integrity_blocks
  for update to authenticated
  using (private.current_role() = 'superadmin')
  with check (private.current_role() = 'superadmin');

create or replace function public.record_runtime_integrity_block(
  p_findings jsonb,
  p_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comercial_id text;
  v_bypass boolean;
  v_role text;
  v_id uuid;
begin
  v_comercial_id := private.current_comercial_id();
  v_role := private.current_role();

  if v_comercial_id is null then
    return null;
  end if;

  if v_role = 'superadmin' then
    return null;
  end if;

  select coalesce(ec.integrity_guard_bypass, false)
  into v_bypass
  from public.erp_comerciales ec
  where ec.id = v_comercial_id;

  if v_bypass then
    return null;
  end if;

  insert into public.runtime_integrity_blocks (comercial_id, findings, fingerprint)
  values (v_comercial_id, coalesce(p_findings, '[]'::jsonb), coalesce(nullif(trim(p_fingerprint), ''), 'unknown'))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.record_runtime_integrity_block(jsonb, text) is
  'Registra un bloqueo del guardián de integridad para el comercial autenticado (excepto superadmin y bypass).';

revoke all on function public.record_runtime_integrity_block(jsonb, text) from public;
grant execute on function public.record_runtime_integrity_block(jsonb, text) to authenticated;

-- Lookup login: incluir bypass
drop function if exists public.lookup_erp_comercial_for_login(text);

create or replace function public.lookup_erp_comercial_for_login(p_email text)
returns table (
  id text,
  full_name text,
  role text,
  manager_id text,
  email text,
  commission_percentage numeric,
  activo boolean,
  integrity_guard_bypass boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ec.id,
    ec.full_name,
    ec.role,
    ec.manager_id,
    ec.email,
    ec.commission_percentage,
    coalesce(ec.activo, true) as activo,
    coalesce(ec.integrity_guard_bypass, false) as integrity_guard_bypass
  from public.erp_comerciales ec
  where ec.email is not null
    and lower(trim(ec.email)) = lower(trim(p_email))
    and coalesce(ec.activo, true) = true
  limit 1;
$$;

comment on function public.lookup_erp_comercial_for_login(text) is
  'Resuelve un comercial invitado por email para login (pre-auth), incl. bypass del guardián de integridad.';

revoke all on function public.lookup_erp_comercial_for_login(text) from public;
grant execute on function public.lookup_erp_comercial_for_login(text) to anon, authenticated;

commit;

-- Manual (SQL Editor):
-- Conceder bypass:  update public.erp_comerciales set integrity_guard_bypass = true where email = 'usuario@ejemplo.com';
-- Revocar bypass:   update public.erp_comerciales set integrity_guard_bypass = false where id = 'usr-x';
-- Cerrar bloqueos:  update public.runtime_integrity_blocks set cleared_at = now(), admin_notes = 'Revisado OK' where comercial_id = 'usr-x' and cleared_at is null;
