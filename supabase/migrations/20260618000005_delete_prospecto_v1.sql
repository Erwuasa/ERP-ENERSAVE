-- Hard delete prospecto + related ventas rows (security definer)

begin;

create or replace function public.delete_prospecto_v1(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.prospectos;
  v_role text;
  v_me text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_row from public.prospectos where id = p_id;
  if not found then
    return false;
  end if;

  v_role := (select private.current_role());
  v_me := (select private.current_comercial_id());

  if v_role = 'superadmin' then
    null;
  elsif v_role = 'jefe_comercial' then
    if v_row.comercial_id is distinct from v_me
      and not exists (
        select 1
        from public.erp_comerciales ec
        where ec.id = v_row.comercial_id
          and ec.manager_id = v_me
      )
    then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif v_row.comercial_id is distinct from v_me then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.tareas_ventas where prospecto_id = p_id;
  delete from public.actividades_ventas where prospecto_id = p_id;
  delete from public.prospectos where id = p_id;

  return true;
end;
$$;

revoke all on function public.delete_prospecto_v1(uuid) from public;
grant execute on function public.delete_prospecto_v1(uuid) to authenticated;

commit;
