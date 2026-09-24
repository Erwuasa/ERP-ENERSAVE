-- Alinear acceso a documentos/notas con la policy SELECT de contratos_equipo (jefe_equipo).

begin;

create or replace function private.can_access_contrato(p_contrato_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
    or exists (
      select 1
      from public.contratos_equipo c
      where c.id = p_contrato_id
        and (
          c.comercial_id = private.current_comercial_id()
          or c.jefe_equipo = private.current_comercial_id()
          or c.comercial_id in (
            select up.id
            from public.user_profiles up
            where up.manager_id = private.current_comercial_id()
          )
        )
    );
$$;

commit;
