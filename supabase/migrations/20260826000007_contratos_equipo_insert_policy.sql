-- ============================================================
-- INSERT en contratos_equipo: faltaba policy explícita para que
-- comerciales/jefes puedan registrar contratos propios al crear
-- desde el wizard (antes solo existían SELECT/UPDATE/DELETE).
-- ============================================================

drop policy if exists contratos_equipo_insert on public.contratos_equipo;
create policy contratos_equipo_insert on public.contratos_equipo
  for insert to authenticated
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id = private.current_comercial_id()
  );
