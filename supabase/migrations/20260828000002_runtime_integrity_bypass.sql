-- Bypass del guardián de integridad + historial de bloqueos (user_profiles)

begin;

alter table public.user_profiles
  add column if not exists integrity_guard_bypass boolean not null default false;

comment on column public.user_profiles.integrity_guard_bypass is
  'Si true, el guardián de integridad runtime no bloquea la sesión.';

create table if not exists public.runtime_integrity_blocks (
  id uuid primary key default gen_random_uuid(),
  comercial_id uuid not null references public.user_profiles (id) on delete cascade,
  findings jsonb not null default '[]'::jsonb,
  fingerprint text not null,
  blocked_at timestamptz not null default now(),
  cleared_at timestamptz,
  cleared_by uuid references public.user_profiles (id) on delete set null,
  admin_notes text
);

create index if not exists runtime_integrity_blocks_comercial_active_idx
  on public.runtime_integrity_blocks (comercial_id)
  where cleared_at is null;

create index if not exists runtime_integrity_blocks_blocked_at_idx
  on public.runtime_integrity_blocks (blocked_at desc);

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
  v_comercial_id uuid;
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

  select coalesce(up.integrity_guard_bypass, false)
  into v_bypass
  from public.user_profiles up
  where up.id = v_comercial_id;

  if v_bypass then
    return null;
  end if;

  insert into public.runtime_integrity_blocks (comercial_id, findings, fingerprint)
  values (
    v_comercial_id,
    coalesce(p_findings, '[]'::jsonb),
    coalesce(nullif(trim(p_fingerprint), ''), 'unknown')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_runtime_integrity_block(jsonb, text) from public;
grant execute on function public.record_runtime_integrity_block(jsonb, text) to authenticated;

commit;
