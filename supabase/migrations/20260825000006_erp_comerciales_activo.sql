-- Soft delete: desactivar acceso sin borrar historial comercial/financiero
begin;

alter table public.user_profiles
  add column if not exists activo boolean not null default true;

comment on column public.user_profiles.activo is
  'false = acceso revocado; fila conservada para contratos, liquidaciones e incidencias';

create index if not exists user_profiles_activo_idx
  on public.user_profiles (activo)
  where activo = false;

create or replace function private.current_comercial_id()
returns uuid
language sql
stable
security definer
set search_path to public, auth
as $$
  select id
    from public.user_profiles
   where id = auth.uid()
     and role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')
     and coalesce(activo, true) = true;
$$;

commit;
