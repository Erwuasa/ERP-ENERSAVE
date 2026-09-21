-- Usuarios: permisos persistidos, jerarquía sin jefe para superadmin/jefe, invitaciones y listados solo superadmin.

begin;

alter table public.user_profiles
  add column if not exists permissions jsonb not null default '{}'::jsonb;

comment on column public.user_profiles.permissions is
  'Permisos de app por usuario. Vacío = valores por defecto del rol.';

update public.user_profiles
set manager_id = null
where role in ('superadmin', 'jefe_comercial', 'tramitacion')
  and manager_id is not null;

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
    permissions = '{}'::jsonb,
    updated_at = now()
  where id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'user not found' using errcode = '22023';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.save_staff_permissions_v1(
  p_user_id uuid,
  p_permissions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_row public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if coalesce((select private.current_role()), '') <> 'superadmin' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    raise exception 'invalid permissions' using errcode = '22023';
  end if;

  update public.user_profiles
  set
    permissions = p_permissions,
    updated_at = now()
  where id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'user not found' using errcode = '22023';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.save_staff_permissions_v1(uuid, jsonb) from public;
grant execute on function public.save_staff_permissions_v1(uuid, jsonb) to authenticated;

create or replace function public.invite_staff_user_v1(
  p_email text,
  p_full_name text,
  p_role text,
  p_manager_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_full_name text := trim(coalesce(p_full_name, ''));
  v_row public.staff_invitations;
  v_existing_role text;
  v_existing_activo boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if coalesce((select private.current_role()), '') <> 'superadmin' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if v_email = '' or v_full_name = '' then
    raise exception 'email and full_name required' using errcode = '22023';
  end if;

  if p_role not in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion') then
    raise exception 'invalid role: %', p_role using errcode = '22023';
  end if;

  if p_role <> 'comercial' then
    p_manager_id := null;
  end if;

  if p_manager_id is not null and not exists (
    select 1 from public.user_profiles
    where id = p_manager_id
      and role in ('superadmin', 'jefe_comercial')
      and coalesce(activo, true) = true
  ) then
    raise exception 'invalid manager_id' using errcode = '22023';
  end if;

  select up.role, coalesce(up.activo, true)
    into v_existing_role, v_existing_activo
  from auth.users au
  join public.user_profiles up on up.id = au.id
  where lower(au.email) = v_email
  limit 1;

  if v_existing_role is not null
    and v_existing_role <> 'customer'
    and coalesce(v_existing_activo, true) = true
  then
    raise exception 'email already has staff access' using errcode = '23505';
  end if;

  insert into public.staff_invitations (email, full_name, role, manager_id, invited_by)
  values (v_email, v_full_name, p_role, p_manager_id, auth.uid())
  on conflict (email) do update
    set
      full_name = excluded.full_name,
      role = excluded.role,
      manager_id = excluded.manager_id,
      invited_by = excluded.invited_by,
      accepted_at = null,
      auth_user_id = null,
      created_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'email', v_row.email,
    'full_name', v_row.full_name,
    'role', v_row.role,
    'manager_id', v_row.manager_id,
    'status', 'pendiente'
  );
end;
$$;

create or replace function public.delete_staff_user_v1(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.user_profiles%rowtype;
begin
  if coalesce(private.current_role(), '') <> 'superadmin' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot delete own account' using errcode = '42501';
  end if;

  select * into v_row
  from public.user_profiles
  where id = p_user_id;

  if not found then
    delete from public.staff_invitations where id = p_user_id;
    if not found then
      raise exception 'user not found' using errcode = 'P0002';
    end if;
    return jsonb_build_object(
      'mode', 'deleted',
      'comercial_id', p_user_id,
      'auth_removed', true
    );
  end if;

  delete from public.staff_invitations
  where auth_user_id = p_user_id
     or (v_row.email is not null and lower(email) = lower(v_row.email));

  begin
    delete from auth.identities where user_id = p_user_id;
    delete from auth.users where id = p_user_id;
    delete from public.user_profiles where id = p_user_id;

    return jsonb_build_object(
      'mode', 'deleted',
      'comercial_id', p_user_id,
      'auth_removed', true
    );
  exception
    when foreign_key_violation then
      update public.user_profiles
      set
        activo = false,
        role = 'customer',
        manager_id = null,
        email = null,
        permissions = '{}'::jsonb,
        full_name = trim(both from v_row.full_name) || ' (eliminado)'
      where id = p_user_id;

      delete from auth.identities where user_id = p_user_id;
      delete from auth.users where id = p_user_id;

      return jsonb_build_object(
        'mode', 'revoked',
        'comercial_id', p_user_id,
        'auth_removed', true,
        'message', 'Acceso eliminado. El historial comercial se conserva. Puedes volver a registrar el mismo correo.'
      );
  end;
end;
$$;

create or replace function public.list_app_users_v1()
returns table (
  user_id text,
  display_name text,
  user_email text,
  user_role text,
  comercial_id text,
  manager_id text,
  has_auth boolean,
  source text
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  if coalesce((select private.current_role()), '') <> 'superadmin' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    up.id::text,
    up.full_name,
    up.email,
    up.role,
    case when up.role = 'customer' then null else up.id::text end,
    up.manager_id::text,
    true,
    'account'::text
  from public.user_profiles up
  where coalesce(up.activo, true) = true

  union all

  select
    si.id::text,
    si.full_name,
    si.email,
    si.role,
    null,
    si.manager_id::text,
    false,
    'invitation'::text
  from public.staff_invitations si
  where si.accepted_at is null;
end;
$function$;

commit;
