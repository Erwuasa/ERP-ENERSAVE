-- Auth-linked profiles. New signups enter as customer; staff roles are assigned later.
-- Canonical apply is on the unified website Supabase project.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer'
    check (role in ('customer', 'comercial', 'jefe_comercial', 'superadmin', 'tramitacion')),
  comercial_id text references public.erp_comerciales (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_role_idx on public.user_profiles (role);
create index if not exists user_profiles_comercial_id_idx on public.user_profiles (comercial_id);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
  on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists user_profiles_insert_own_customer on public.user_profiles;
create policy user_profiles_insert_own_customer
  on public.user_profiles
  for insert
  to authenticated
  with check (id = auth.uid() and role = 'customer');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
