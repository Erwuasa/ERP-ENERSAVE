-- Borrado de contratos_equipo: solo borradores en estados iniciales
-- (Pendiente de info. / Borrador / PTE DE TRAMITACIÓN) por dueño o gestión.

drop policy if exists contratos_equipo_delete on public.contratos_equipo;
create policy contratos_equipo_delete on public.contratos_equipo
  for delete to authenticated
  using (
    (
      private.current_role() in ('superadmin', 'tramitacion')
      or comercial_id = private.current_comercial_id()
    )
    and estado in ('Pendiente de info.', 'PTE DE TRAMITACIÓN', 'Borrador')
  );
