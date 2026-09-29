-- Director comercial: SELECT de contratos de comerciales con manager_id = director.
-- Tramitación: DELETE de cualquier contrato (sin límite de estado).

begin;

drop policy if exists contratos_equipo_select on public.contratos_equipo;
create policy contratos_equipo_select on public.contratos_equipo
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
    or jefe_equipo = private.current_comercial_id()
    or exists (
      select 1
      from public.user_profiles up
      where up.id = contratos_equipo.comercial_id
        and up.manager_id = private.current_comercial_id()
    )
    or source = 'at'
  );

drop policy if exists contratos_equipo_delete on public.contratos_equipo;
create policy contratos_equipo_delete on public.contratos_equipo
  for delete to authenticated
  using (
    coalesce((select private.current_role()), '') = 'tramitacion'
  );

commit;
