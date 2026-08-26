-- Superadmin: elimina Auth + user_profiles, o revoca acceso si hay historial (contratos, etc.).
-- No puede borrarse a sí mismo. Cuentas con activo=false no obtienen rol ni comercial_id.

begin;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path to public, auth
as $$
  select case
    when exists (
      select 1
      from public.user_profiles
      where id = auth.uid()
        and coalesce(activo, true) = false
    ) then null::text
    else coalesce(
      (select role from public.user_profiles where id = auth.uid()),
      private.jwt_user_role()
    )
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
    raise exception 'user not found' using errcode = 'P0002';
  end if;

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
        email = null,
        full_name = trim(both from v_row.full_name) || ' (eliminado)'
      where id = p_user_id;

      delete from auth.identities where user_id = p_user_id;

      return jsonb_build_object(
        'mode', 'revoked',
        'comercial_id', p_user_id,
        'auth_removed', true,
        'message', 'Credenciales eliminadas. Fila conservada por historial comercial.'
      );
  end;
end;
$$;

comment on function public.delete_staff_user_v1(uuid) is
  'Superadmin: borra Auth/user_profiles, o revoca acceso (activo=false) si hay FK.';

revoke all on function public.delete_staff_user_v1(uuid) from public;
grant execute on function public.delete_staff_user_v1(uuid) to authenticated;

commit;
