-- Superadmin puede eliminar contratos (mismo criterio que tramitación).

begin;

drop policy if exists contratos_equipo_delete on public.contratos_equipo;
create policy contratos_equipo_delete on public.contratos_equipo
  for delete to authenticated
  using (
    coalesce((select private.current_role()), '') in ('tramitacion', 'superadmin')
  );

commit;
