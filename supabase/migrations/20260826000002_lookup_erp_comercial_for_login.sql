-- Lookup de comercial por email para login (anon/authenticated, sin listar todo el directorio)

begin;

create or replace function public.lookup_erp_comercial_for_login(p_email text)
returns table (
  id text,
  full_name text,
  role text,
  manager_id text,
  email text,
  commission_percentage numeric,
  activo boolean
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
    coalesce(ec.activo, true) as activo
  from public.erp_comerciales ec
  where ec.email is not null
    and lower(trim(ec.email)) = lower(trim(p_email))
    and coalesce(ec.activo, true) = true
  limit 1;
$$;

comment on function public.lookup_erp_comercial_for_login(text) is
  'Resuelve un comercial invitado por email para el flujo de login (pre-auth).';

revoke all on function public.lookup_erp_comercial_for_login(text) from public;
grant execute on function public.lookup_erp_comercial_for_login(text) to anon, authenticated;

commit;
