-- Comisión visible del comercial: solo superadmin puede guardarla en user_profiles.

begin;

create or replace function public.save_staff_commission_v1(
  p_user_id uuid,
  p_commission_percentage numeric
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_row public.user_profiles;
  v_role text;
  v_pct numeric;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if coalesce((select private.current_role()), '') <> 'superadmin' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_commission_percentage is null or p_commission_percentage < 0 or p_commission_percentage > 100 then
    raise exception 'commission must be between 0 and 100' using errcode = '22023';
  end if;

  select role into v_role
  from public.user_profiles
  where id = p_user_id;

  if v_role is null then
    raise exception 'user not found' using errcode = '22023';
  end if;

  if v_role not in ('comercial', 'jefe_comercial') then
    raise exception 'commission percentage only applies to comercial or jefe_comercial' using errcode = '22023';
  end if;

  v_pct := round(p_commission_percentage, 2);

  update public.user_profiles
  set
    commission_percentage = v_pct,
    updated_at = now()
  where id = p_user_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.save_staff_commission_v1(uuid, numeric) from public;
grant execute on function public.save_staff_commission_v1(uuid, numeric) to authenticated;

commit;
