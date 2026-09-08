-- Indica si el login debe mostrar ayuda de contraseña temporal (primer acceso).

begin;

create or replace function public.staff_login_needs_onboarding_hint(p_email text)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(coalesce(p_email, '')))
      and coalesce((u.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
$$;

revoke all on function public.staff_login_needs_onboarding_hint(text) from public;
grant execute on function public.staff_login_needs_onboarding_hint(text) to anon, authenticated;

commit;
