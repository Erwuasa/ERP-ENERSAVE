-- Directorio admin: cuentas Auth + asesores del organigrama sin cuenta.
-- Nombres de salida distintos a columnas de tabla para evitar "id is ambiguous".

drop function if exists public.list_app_users_v1();

create or replace function public.list_app_users_v1()
returns table (
  user_id text,
  display_name text,
  user_email text,
  user_role text,
  comercial_id text,
  manager_id text,
  has_auth boolean,
  source text
)
language plpgsql
security definer
set search_path to public, auth, pg_temp
as $function$
begin
  if not (
    exists (
      select 1
        from public.user_profiles caller
       where caller.id = auth.uid()
         and caller.role in ('superadmin', 'tramitacion')
    )
    or coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    up.id::text,
    up.full_name,
    au.email::text,
    up.role,
    up.comercial_id,
    ec.manager_id,
    true,
    'account'::text
  from public.user_profiles up
  join auth.users au on au.id = up.id
  left join public.erp_comerciales ec on ec.id = up.comercial_id

  union all

  select
    ec.id,
    ec.full_name,
    ec.email,
    ec.role,
    ec.id,
    ec.manager_id,
    false,
    'staff_directory'::text
  from public.erp_comerciales ec
  where ec.auth_user_id is null
    and not exists (
      select 1
        from public.user_profiles linked
       where linked.comercial_id = ec.id
    );
end;
$function$;

revoke all on function public.list_app_users_v1() from public;
grant execute on function public.list_app_users_v1() to authenticated;
