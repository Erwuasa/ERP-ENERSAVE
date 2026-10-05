-- Comercial / director: borrar solo borradores propios o del equipo, sin documentos en JSON.

begin;

drop policy if exists contratos_equipo_delete on public.contratos_equipo;
create policy contratos_equipo_delete on public.contratos_equipo
  for delete to authenticated
  using (
    coalesce((select private.current_role()), '') in ('tramitacion', 'superadmin')
    or (
      coalesce(jsonb_array_length(documentos), 0) = 0
      and (
        lower(trim(estado)) in ('borrador', 'pendiente de info.', 'pendiente de información')
        or estado = 'Borrador'
      )
      and (
        comercial_id = private.current_comercial_id()
        or jefe_equipo = private.current_comercial_id()
        or exists (
          select 1
          from public.user_profiles up
          where up.id = contratos_equipo.comercial_id
            and up.manager_id = private.current_comercial_id()
        )
      )
    )
  );

commit;
