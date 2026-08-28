-- Invitaciones staff (email sin cuenta Auth aún) + registro público controlado

begin;

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role text not null check (role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')),
  manager_id uuid references public.user_profiles (id) on delete set null,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  auth_user_id uuid references auth.users (id) on delete set null,
  constraint staff_invitations_email_unique unique (email)
);

create index if not exists staff_invitations_email_lower_idx
  on public.staff_invitations (lower(email));

alter table public.staff_invitations enable row level security;

drop policy if exists staff_invitations_ops_admin on public.staff_invitations;
create policy staff_invitations_ops_admin
  on public.staff_invitations
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('superadmin', 'tramitacion')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('superadmin', 'tramitacion')
    )
  );

create or replace function public.is_email_invited_for_signup(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_invitations si
    where lower(si.email) = lower(trim(p_email))
      and si.accepted_at is null
  );
$$;

revoke all on function public.is_email_invited_for_signup(text) from public;
grant execute on function public.is_email_invited_for_signup(text) to anon, authenticated;

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
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if coalesce((select private.current_role()), '') not in ('superadmin', 'tramitacion') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if v_email = '' or v_full_name = '' then
    raise exception 'email and full_name required' using errcode = '22023';
  end if;

  if p_role not in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion') then
    raise exception 'invalid role: %', p_role using errcode = '22023';
  end if;

  if p_manager_id is not null and not exists (
    select 1 from public.user_profiles
    where id = p_manager_id
      and role in ('superadmin', 'jefe_comercial')
  ) then
    raise exception 'invalid manager_id' using errcode = '22023';
  end if;

  select up.role into v_existing_role
  from auth.users au
  join public.user_profiles up on up.id = au.id
  where lower(au.email) = v_email
  limit 1;

  if v_existing_role is not null and v_existing_role <> 'customer' then
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

revoke all on function public.invite_staff_user_v1(text, text, text, uuid) from public;
grant execute on function public.invite_staff_user_v1(text, text, text, uuid) to authenticated;

create or replace function public.cancel_staff_invitation_v1(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if coalesce((select private.current_role()), '') not in ('superadmin', 'tramitacion') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.staff_invitations
  where id = p_invitation_id
    and accepted_at is null;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.cancel_staff_invitation_v1(uuid) from public;
grant execute on function public.cancel_staff_invitation_v1(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to public, auth
as $$
declare
  v_inv public.staff_invitations;
  v_commission numeric;
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 1)
  );

  select * into v_inv
  from public.staff_invitations si
  where lower(si.email) = lower(new.email)
    and si.accepted_at is null
  limit 1;

  if found then
    v_full_name := coalesce(nullif(v_inv.full_name, ''), v_full_name);
    v_commission := case v_inv.role
      when 'superadmin' then 100
      when 'jefe_comercial' then 85
      when 'tramitacion' then 0
      else 60
    end;

    insert into public.user_profiles (id, full_name, role, email, manager_id, commission_percentage)
    values (new.id, v_full_name, v_inv.role, new.email, v_inv.manager_id, v_commission)
    on conflict (id) do update
      set
        full_name = excluded.full_name,
        role = excluded.role,
        email = excluded.email,
        manager_id = excluded.manager_id,
        commission_percentage = excluded.commission_percentage;

    update public.staff_invitations
    set accepted_at = now(), auth_user_id = new.id
    where id = v_inv.id;
  else
    insert into public.user_profiles (id, full_name, role, email)
    values (new.id, v_full_name, 'customer', new.email)
    on conflict (id) do update
      set email = excluded.email
      where public.user_profiles.email is null;
  end if;

  update public.leads
  set auth_user_id = new.id
  where auth_user_id is null
    and email is not null
    and lower(email) = lower(new.email);

  return new;
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
set search_path to public, auth, pg_temp
as $function$
begin
  if not (
    exists (
      select 1 from public.user_profiles caller
      where caller.id = auth.uid()
        and caller.role in ('superadmin', 'tramitacion')
    )
    or coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    up.id::text,
    up.full_name,
    coalesce(up.email, au.email)::text,
    up.role,
    case when up.role = 'customer' then null else up.id::text end,
    up.manager_id::text,
    true,
    'account'::text
  from public.user_profiles up
  left join auth.users au on au.id = up.id

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
