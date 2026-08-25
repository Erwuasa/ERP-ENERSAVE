-- Bootstrap: primer superadmin real + bloqueo de registro público (solo invitación EnerSave)
-- Pantalla Usuarios (App.tsx): public.erp_comerciales + Supabase Auth metadata (comercial_id, role)
-- RLS ERP: private.current_comercial_id() / private.current_role() leen erp_comerciales + JWT
--
-- EJECUCIÓN: Supabase SQL Editor (service role) o `supabase db push`
-- POST-MIGRACIÓN (Dashboard): Authentication → Providers → Email → desactivar «Enable sign ups»
--
-- Credenciales bootstrap (cambiar contraseña tras primer acceso):
--   Email: germanbayonr@gmail.com
--   Password: Unicornia-00

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Tabla profiles (Next.js / supabase-setup.sql) — idempotente
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('superadmin', 'jefe_comercial', 'comercial');
  end if;
end $$;

do $$ begin
  alter type public.user_role add value if not exists 'tramitacion';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'comercial',
  manager_id uuid references public.profiles (id) on delete set null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Limpieza: sin usuarios demo (brownfield → producción)
--    Idempotente: borra todo y recrea el superadmin bootstrap
-- ---------------------------------------------------------------------------
delete from public.profiles;
delete from auth.identities;
delete from auth.users;
delete from public.erp_comerciales;

-- ---------------------------------------------------------------------------
-- 3) Fila comercial invitada (debe existir ANTES del insert en auth.users)
-- ---------------------------------------------------------------------------
insert into public.erp_comerciales (
  id,
  full_name,
  role,
  manager_id,
  email,
  auth_user_id,
  commission_percentage,
  activo
) values (
  'usr-1',
  'German Bayón',
  'superadmin',
  null,
  'germanbayonr@gmail.com',
  null,
  100,
  true
);

-- ---------------------------------------------------------------------------
-- 4) Usuario Auth + identidad email (login signInWithPassword)
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'germanbayonr@gmail.com';
  v_password text := 'Unicornia-00';
  v_comercial_id text := 'usr-1';
  v_full_name text := 'German Bayón';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'role', 'superadmin',
      'comercial_id', v_comercial_id
    ),
    jsonb_build_object(
      'full_name', v_full_name,
      'role', 'superadmin',
      'comercial_id', v_comercial_id
    ),
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  );

  update public.erp_comerciales
  set
    auth_user_id = v_user_id,
    email = v_email,
    updated_at = now()
  where id = v_comercial_id;

  insert into public.profiles (id, full_name, role, manager_id, permissions)
  values (
    v_user_id,
    v_full_name,
    'superadmin',
    null,
    jsonb_build_object(
      'contractsView', true,
      'comparatorAccess', true,
      'quickSettlement', true,
      'exportDatabase', true,
      'viewRetrocommissions', true
    )
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    permissions = excluded.permissions;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Registro público: solo emails pre-invitados en erp_comerciales
--    (superadmin crea filas vía pantalla Usuarios → insertErpComercial)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invited record;
  invited_role public.user_role;
begin
  select ec.id, ec.full_name, ec.role, ec.manager_id
  into invited
  from public.erp_comerciales ec
  where lower(ec.email) = lower(new.email)
    and coalesce(ec.activo, true) = true
  limit 1;

  if not found then
    raise exception
      'Registro no permitido. Solo usuarios invitados por EnerSave pueden crear cuenta. Contacta con administración.';
  end if;

  begin
    invited_role := invited.role::public.user_role;
  exception
    when invalid_text_representation then
      invited_role := 'comercial';
  end;

  update public.erp_comerciales
  set
    auth_user_id = new.id,
    updated_at = now()
  where id = invited.id;

  insert into public.profiles (id, full_name, role, manager_id, permissions)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', invited.full_name),
    invited_role,
    null,
    case invited.role
      when 'superadmin' then jsonb_build_object(
        'contractsView', true,
        'comparatorAccess', true,
        'quickSettlement', true,
        'exportDatabase', true,
        'viewRetrocommissions', true
      )
      when 'tramitacion' then jsonb_build_object(
        'contractsView', true,
        'comparatorAccess', false,
        'quickSettlement', false,
        'exportDatabase', true,
        'viewRetrocommissions', false
      )
      when 'jefe_comercial' then jsonb_build_object(
        'contractsView', true,
        'comparatorAccess', true,
        'quickSettlement', true,
        'exportDatabase', false,
        'viewRetrocommissions', true
      )
      else jsonb_build_object(
        'contractsView', true,
        'comparatorAccess', true,
        'quickSettlement', false,
        'exportDatabase', false,
        'viewRetrocommissions', false
      )
    end
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    permissions = excluded.permissions;

  return new;
exception
  when others then
    raise exception 'Error al vincular cuenta invitada: %', sqlerrm;
end;
$$;

comment on function public.handle_new_user_signup() is
  'Solo permite signup si el email existe en erp_comerciales (invitación EnerSave). Vincula auth_user_id y crea profiles.';

drop trigger if exists trigger_on_auth_user_created on auth.users;

create trigger trigger_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_signup();

-- Helper opcional: comprobar invitación desde la app
create or replace function public.is_email_invited_for_signup(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.erp_comerciales ec
    where lower(ec.email) = lower(trim(p_email))
      and coalesce(ec.activo, true) = true
  );
$$;

grant execute on function public.is_email_invited_for_signup(text) to authenticated, anon;

commit;

-- Verificación manual:
-- select id, email, raw_app_meta_data->>'role' as role from auth.users;
-- select id, email, role, auth_user_id, activo from public.erp_comerciales;
-- select id, full_name, role from public.profiles;
