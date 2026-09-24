-- Al guardar rol sin cambiarlo, no resetear commission_percentage (p. ej. comisión visible 40 %).

begin;

create or replace function public.assign_staff_role_v1(
  p_user_id uuid,
  p_role text,
  p_manager_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_row public.user_profiles;
  v_commission numeric;
  v_prev_role text;
  v_prev_commission numeric;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if coalesce((select private.current_role()), '') <> 'superadmin' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_role not in ('customer', 'comercial', 'jefe_comercial', 'superadmin', 'tramitacion') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  select role, commission_percentage
  into v_prev_role, v_prev_commission
  from public.user_profiles
  where id = p_user_id;

  if p_role = 'customer' then
    p_manager_id := null;
    v_commission := 0;
  elsif p_role = 'superadmin' then
    p_manager_id := null;
    v_commission := 100;
  elsif p_role = 'jefe_comercial' then
    p_manager_id := null;
    v_commission := 85;
  elsif p_role = 'tramitacion' then
    p_manager_id := null;
    v_commission := 0;
  else
    v_commission := 60;
  end if;

  if v_prev_role = p_role and p_role in ('comercial', 'jefe_comercial') then
    v_commission := coalesce(v_prev_commission, v_commission);
  end if;

  if p_manager_id is not null and not exists (
    select 1 from public.user_profiles
    where id = p_manager_id
      and role in ('superadmin', 'jefe_comercial')
      and coalesce(activo, true) = true
  ) then
    raise exception 'invalid manager_id' using errcode = '22023';
  end if;

  update public.user_profiles
  set
    role = p_role,
    manager_id = p_manager_id,
    commission_percentage = v_commission,
    permissions = case when v_prev_role is distinct from p_role then '{}'::jsonb else permissions end,
    updated_at = now()
  where id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'user not found' using errcode = '22023';
  end if;

  return to_jsonb(v_row);
end;
$$;

commit;
