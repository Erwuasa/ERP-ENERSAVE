-- Soft delete: desactivar acceso sin borrar historial comercial/financiero
-- Idempotente — seguro re-ejecutar en Supabase remoto

begin;

alter table public.erp_comerciales
  add column if not exists activo boolean not null default true;

comment on column public.erp_comerciales.activo is
  'false = acceso revocado; fila conservada para contratos, liquidaciones e incidencias';

create index if not exists erp_comerciales_activo_idx
  on public.erp_comerciales (activo)
  where activo = false;

-- RLS helpers: usuario desactivado no obtiene comercial_id ni rol
create or replace function private.current_comercial_id()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  with raw as (
    select coalesce(
      auth.jwt() -> 'app_metadata' ->> 'comercial_id',
      auth.jwt() -> 'user_metadata' ->> 'comercial_id',
      (
        select ec.id
        from public.erp_comerciales ec
        where ec.auth_user_id = auth.uid()
      ),
      (
        select ec.id
        from public.erp_comerciales ec
        where ec.email is not null
          and lower(ec.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      ),
      private.email_comercial_id(auth.jwt() ->> 'email')
    ) as id
  )
  select r.id
  from raw r
  inner join public.erp_comerciales ec on ec.id = r.id
  where coalesce(ec.activo, true) = true;
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when private.current_comercial_id() is null then null::text
    else coalesce(
      (
        select ec.role
        from public.erp_comerciales ec
        where ec.id = private.current_comercial_id()
      ),
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      private.email_comercial_role(auth.jwt() ->> 'email')
    )
  end;
$$;

commit;
