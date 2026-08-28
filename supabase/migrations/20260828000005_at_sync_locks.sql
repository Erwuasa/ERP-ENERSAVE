-- Serialize AT full-catalog syncs (webhook retries overlap and raced delete+insert on tariff_prices).

create table if not exists public.at_sync_locks (
  job text primary key,
  locked_at timestamptz not null default now()
);

alter table public.at_sync_locks enable row level security;

revoke all on table public.at_sync_locks from public, anon, authenticated;
grant all on table public.at_sync_locks to service_role;

create or replace function public.try_acquire_at_sync_lock(
  p_job text,
  p_stale_seconds integer default 480
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  acquired boolean;
begin
  insert into public.at_sync_locks (job, locked_at)
  values (p_job, now())
  on conflict (job) do update
    set locked_at = excluded.locked_at
    where public.at_sync_locks.locked_at < now() - make_interval(secs => p_stale_seconds)
  returning true into acquired;

  return coalesce(acquired, false);
end;
$$;

create or replace function public.release_at_sync_lock(p_job text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.at_sync_locks where job = p_job;
$$;

revoke all on function public.try_acquire_at_sync_lock(text, integer) from public, anon, authenticated;
revoke all on function public.release_at_sync_lock(text) from public, anon, authenticated;
grant execute on function public.try_acquire_at_sync_lock(text, integer) to service_role;
grant execute on function public.release_at_sync_lock(text) to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tariff_prices_tariff_period_key'
      and conrelid = 'public.tariff_prices'::regclass
  ) then
    alter table public.tariff_prices
      add constraint tariff_prices_tariff_period_key unique using index tariff_prices_tariff_period_key;
  end if;
end $$;
