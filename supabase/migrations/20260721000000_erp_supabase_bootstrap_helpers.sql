-- Dependencias mínimas para migraciones ERP en Supabase (SQL Editor / CLI).
-- Ejecutar ANTES de marco_retributivo si faltan funciones base.

begin;

create schema if not exists private;

grant usage on schema private to postgres, authenticated, service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger genérico: actualiza updated_at en BEFORE UPDATE.';

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
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ));
$$;

comment on function private.jwt_user_role() is
  'Lee user_role del JWT (comercial, superadmin, tramitacion, etc.).';

commit;
