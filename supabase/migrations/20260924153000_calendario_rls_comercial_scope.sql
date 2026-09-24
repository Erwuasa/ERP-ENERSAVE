-- Calendario: visibilidad por rol comercial (superadmin todo; jefe equipo; comercial propio).

begin;

drop policy if exists calendario_select on public.calendario_eventos;
create policy calendario_select on public.calendario_eventos
  for select to authenticated
  using (
    private.current_role() = 'superadmin'
    or usuario_id = private.current_comercial_id()
    or (
      private.current_role() = 'jefe_comercial'
      and usuario_id in (
        select id from public.user_profiles
        where id = private.current_comercial_id()
           or manager_id = private.current_comercial_id()
      )
    )
  );

drop policy if exists calendario_insert on public.calendario_eventos;
create policy calendario_insert on public.calendario_eventos
  for insert to authenticated
  with check (
    usuario_id = private.current_comercial_id()
    or private.current_role() = 'superadmin'
  );

drop policy if exists calendario_update on public.calendario_eventos;
create policy calendario_update on public.calendario_eventos
  for update to authenticated
  using (
    usuario_id = private.current_comercial_id()
    or private.current_role() = 'superadmin'
  )
  with check (
    usuario_id = private.current_comercial_id()
    or private.current_role() = 'superadmin'
  );

drop policy if exists calendario_delete on public.calendario_eventos;
create policy calendario_delete on public.calendario_eventos
  for delete to authenticated
  using (
    usuario_id = private.current_comercial_id()
    or private.current_role() = 'superadmin'
  );

commit;
