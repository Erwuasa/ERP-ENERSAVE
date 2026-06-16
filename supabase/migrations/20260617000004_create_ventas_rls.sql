-- RLS for ventas tables + erp_comerciales bridge
-- DATA-02
-- NOTE: contratos_equipo has NO RLS in Phase 1 — deferred to Phase 7 integration
-- NOTE: anon key without JWT returns zero rows until auth milestone

create schema if not exists private;

comment on schema private is 'RLS helper functions — do NOT expose in Supabase API settings';

create or replace function private.current_comercial_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'comercial_id',
    (select ec.id from public.erp_comerciales ec where ec.auth_user_id = auth.uid())
  );
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    (select ec.role from public.erp_comerciales ec where ec.auth_user_id = auth.uid())
  );
$$;

create or replace function private.accessible_comercial_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select ec.id
  from public.erp_comerciales ec
  where (
    (select private.current_role()) = 'superadmin'
  )
  or (
    (select private.current_role()) = 'jefe_comercial'
    and (
      ec.id = (select private.current_comercial_id())
      or ec.manager_id = (select private.current_comercial_id())
    )
  )
  or (
    (select private.current_role()) = 'comercial'
    and ec.id = (select private.current_comercial_id())
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_comercial_id() to authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function private.accessible_comercial_ids() to authenticated;

alter table public.erp_comerciales enable row level security;
alter table public.prospectos enable row level security;
alter table public.actividades_ventas enable row level security;
alter table public.tareas_ventas enable row level security;

-- erp_comerciales
create policy erp_comerciales_select_authenticated
  on public.erp_comerciales
  for select
  to authenticated
  using (
    id in (select private.accessible_comercial_ids())
    or (select private.current_role()) = 'superadmin'
  );

create policy erp_comerciales_insert_superadmin
  on public.erp_comerciales
  for insert
  to authenticated
  with check ((select private.current_role()) = 'superadmin');

create policy erp_comerciales_update_superadmin
  on public.erp_comerciales
  for update
  to authenticated
  using ((select private.current_role()) = 'superadmin')
  with check ((select private.current_role()) = 'superadmin');

create policy erp_comerciales_delete_superadmin
  on public.erp_comerciales
  for delete
  to authenticated
  using ((select private.current_role()) = 'superadmin');

-- prospectos
create policy prospectos_select_authenticated
  on public.prospectos
  for select
  to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()));

create policy prospectos_insert_authenticated
  on public.prospectos
  for insert
  to authenticated
  with check (
    comercial_id in (select private.accessible_comercial_ids())
    and (
      comercial_id = (select private.current_comercial_id())
      or (select private.current_role()) in ('jefe_comercial', 'superadmin')
    )
  );

create policy prospectos_update_authenticated
  on public.prospectos
  for update
  to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()))
  with check (
    comercial_id in (select private.accessible_comercial_ids())
    and (
      (select private.current_role()) = 'superadmin'
      or comercial_id = (select private.current_comercial_id())
      or (select private.current_role()) = 'jefe_comercial'
    )
  );

create policy prospectos_delete_superadmin
  on public.prospectos
  for delete
  to authenticated
  using ((select private.current_role()) = 'superadmin');

-- actividades_ventas (immutable — no UPDATE/DELETE for standard roles)
create policy actividades_ventas_select_authenticated
  on public.actividades_ventas
  for select
  to authenticated
  using (
    prospecto_id in (
      select p.id from public.prospectos p
      where p.comercial_id in (select private.accessible_comercial_ids())
    )
  );

create policy actividades_ventas_insert_authenticated
  on public.actividades_ventas
  for insert
  to authenticated
  with check (
    tipo <> 'cambio_fase'
    and prospecto_id in (
      select p.id from public.prospectos p
      where p.comercial_id in (select private.accessible_comercial_ids())
    )
    and comercial_id in (select private.accessible_comercial_ids())
  );

-- tareas_ventas
create policy tareas_ventas_select_authenticated
  on public.tareas_ventas
  for select
  to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()));

create policy tareas_ventas_insert_authenticated
  on public.tareas_ventas
  for insert
  to authenticated
  with check (comercial_id in (select private.accessible_comercial_ids()));

create policy tareas_ventas_update_authenticated
  on public.tareas_ventas
  for update
  to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()))
  with check (comercial_id in (select private.accessible_comercial_ids()));

create policy tareas_ventas_delete_superadmin
  on public.tareas_ventas
  for delete
  to authenticated
  using ((select private.current_role()) = 'superadmin');
