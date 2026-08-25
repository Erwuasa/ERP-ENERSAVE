-- Eliminar usuario ERP: borra credenciales Auth + profiles; elimina o revoca erp_comerciales.
-- Solo superadmin. No puede borrarse a sí mismo.

begin;

create or replace function public.delete_erp_comercial_user_v1(p_comercial_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.erp_comerciales%rowtype;
  v_auth_id uuid;
begin
  if coalesce(private.current_role(), '') <> 'superadmin' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_comercial_id = private.current_comercial_id() then
    raise exception 'cannot delete own account' using errcode = '42501';
  end if;

  select * into v_row
  from public.erp_comerciales
  where id = p_comercial_id;

  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  v_auth_id := v_row.auth_user_id;

  if v_auth_id is not null then
    delete from auth.identities where user_id = v_auth_id;
    delete from auth.users where id = v_auth_id;
  end if;

  if to_regclass('public.profiles') is not null and v_auth_id is not null then
    delete from public.profiles where id = v_auth_id;
  end if;

  begin
    delete from public.erp_comerciales where id = p_comercial_id;
    return jsonb_build_object(
      'mode', 'deleted',
      'comercial_id', p_comercial_id,
      'auth_removed', v_auth_id is not null
    );
  exception
    when foreign_key_violation then
      update public.erp_comerciales
      set
        email = null,
        auth_user_id = null,
        activo = false,
        full_name = trim(both from v_row.full_name) || ' (eliminado)',
        updated_at = now()
      where id = p_comercial_id;

      return jsonb_build_object(
        'mode', 'revoked',
        'comercial_id', p_comercial_id,
        'auth_removed', v_auth_id is not null,
        'message', 'Credenciales eliminadas. Fila conservada por historial comercial.'
      );
  end;
end;
$$;

comment on function public.delete_erp_comercial_user_v1(text) is
  'Superadmin: elimina Auth/profiles y borra erp_comerciales, o revoca acceso si hay FK.';

revoke all on function public.delete_erp_comercial_user_v1(text) from public;
grant execute on function public.delete_erp_comercial_user_v1(text) to authenticated;

commit;
