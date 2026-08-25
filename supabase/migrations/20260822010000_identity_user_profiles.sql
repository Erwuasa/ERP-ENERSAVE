-- Identidad única: auth.users + user_profiles (UUID). Drop erp_comerciales.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Seed Auth staff (password dev 123456)
-- ---------------------------------------------------------------------------
create or replace function private.seed_auth_user(
  p_id uuid,
  p_email text,
  p_full_name text
)
returns void
language plpgsql
security definer
set search_path to auth, extensions, public
as $fn$
begin
  if exists (select 1 from auth.users where id = p_id or lower(email) = lower(p_email)) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt('123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(), now(), '', '', '', '', false, false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    p_id::text,
    now(), now(), now()
  );
end;
$fn$;

select private.seed_auth_user(
  'a1111111-0000-4000-8000-000000000001'::uuid,
  'carlos@enersave.com',
  'Carlos De la Fuente'
);
select private.seed_auth_user(
  'a1111111-0000-4000-8000-000000000002'::uuid,
  'elena@enersave.com',
  'Elena Garrido'
);
select private.seed_auth_user(
  'a1111111-0000-4000-8000-000000000003'::uuid,
  'ignacio@enersave.com',
  'Ignacio Ortiz'
);
select private.seed_auth_user(
  'a1111111-0000-4000-8000-000000000004'::uuid,
  'marta@enersave.com',
  'Marta Rivas'
);
select private.seed_auth_user(
  'a1111111-0000-4000-8000-000000000006'::uuid,
  'tramitacion@enersave.com',
  'Laura Tramitación'
);

drop function private.seed_auth_user(uuid, text, text);

-- Map old text ids → auth uuids
create temporary table comercial_id_map (
  old_id text primary key,
  new_id uuid not null
);

insert into comercial_id_map (old_id, new_id) values
  ('usr-carlos', '72cf9430-b8f2-4960-991e-ac5ff4582e23'),
  ('usr-1', 'a1111111-0000-4000-8000-000000000001'),
  ('usr-2', 'a1111111-0000-4000-8000-000000000002'),
  ('usr-3', 'a1111111-0000-4000-8000-000000000003'),
  ('usr-4', 'a1111111-0000-4000-8000-000000000004'),
  ('usr-6', 'a1111111-0000-4000-8000-000000000006');

-- ---------------------------------------------------------------------------
-- 2. user_profiles: email, manager_id, commission; drop comercial_id
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists email text,
  add column if not exists manager_id uuid,
  add column if not exists commission_percentage numeric(5, 2) not null default 0;

update public.user_profiles up
set email = au.email
from auth.users au
where au.id = up.id
  and (up.email is null or up.email = '');

-- Staff roles + hierarchy (trigger already created customer rows for new auth users)
update public.user_profiles
set
  full_name = 'Carlos De la Fuente',
  role = 'superadmin',
  manager_id = null,
  commission_percentage = 100,
  email = 'carlos@enersave.com'
where id = 'a1111111-0000-4000-8000-000000000001';

update public.user_profiles
set
  full_name = 'Elena Garrido',
  role = 'jefe_comercial',
  manager_id = 'a1111111-0000-4000-8000-000000000001',
  commission_percentage = 85,
  email = 'elena@enersave.com'
where id = 'a1111111-0000-4000-8000-000000000002';

update public.user_profiles
set
  full_name = 'Ignacio Ortiz',
  role = 'comercial',
  manager_id = 'a1111111-0000-4000-8000-000000000002',
  commission_percentage = 60,
  email = 'ignacio@enersave.com'
where id = 'a1111111-0000-4000-8000-000000000003';

update public.user_profiles
set
  full_name = 'Marta Rivas',
  role = 'comercial',
  manager_id = 'a1111111-0000-4000-8000-000000000002',
  commission_percentage = 70,
  email = 'marta@enersave.com'
where id = 'a1111111-0000-4000-8000-000000000004';

update public.user_profiles
set
  full_name = 'Laura Tramitación',
  role = 'tramitacion',
  manager_id = 'a1111111-0000-4000-8000-000000000001',
  commission_percentage = 0,
  email = 'tramitacion@enersave.com'
where id = 'a1111111-0000-4000-8000-000000000006';

update public.user_profiles
set
  manager_id = null,
  commission_percentage = 100,
  email = coalesce(email, 'andresaltamirasanz@gmail.com')
where id = '72cf9430-b8f2-4960-991e-ac5ff4582e23';

alter table public.user_profiles drop constraint if exists user_profiles_comercial_id_fkey;
alter table public.user_profiles drop column if exists comercial_id;

alter table public.user_profiles drop constraint if exists user_profiles_manager_id_fkey;
alter table public.user_profiles
  add constraint user_profiles_manager_id_fkey
  foreign key (manager_id) references public.user_profiles (id) on delete set null;

create index if not exists user_profiles_manager_id_idx on public.user_profiles (manager_id);
create index if not exists user_profiles_email_lower_idx on public.user_profiles (lower(email));

-- ---------------------------------------------------------------------------
-- 3. Remap FK columns text usr-* → uuid
-- ---------------------------------------------------------------------------
alter table public.prospectos drop constraint if exists prospectos_comercial_id_fkey;
alter table public.actividades_ventas drop constraint if exists actividades_ventas_comercial_id_fkey;
alter table public.tareas_ventas drop constraint if exists tareas_ventas_comercial_id_fkey;
alter table public.leads drop constraint if exists leads_assigned_comercial_id_fkey;
alter table public.leads drop constraint if exists leads_assigned_by_comercial_id_fkey;
alter table public.marco_retributivo drop constraint if exists marco_retributivo_updated_by_fkey;

update public.prospectos p
set comercial_id = m.new_id::text
from comercial_id_map m
where p.comercial_id = m.old_id;

update public.actividades_ventas a
set comercial_id = m.new_id::text
from comercial_id_map m
where a.comercial_id = m.old_id;

update public.tareas_ventas t
set comercial_id = m.new_id::text
from comercial_id_map m
where t.comercial_id = m.old_id;

update public.leads l
set assigned_comercial_id = m.new_id::text
from comercial_id_map m
where l.assigned_comercial_id = m.old_id;

update public.leads l
set assigned_by_comercial_id = m.new_id::text
from comercial_id_map m
where l.assigned_by_comercial_id = m.old_id;

update public.marco_retributivo r
set updated_by = m.new_id::text
from comercial_id_map m
where r.updated_by = m.old_id;

drop function if exists private.current_comercial_id() cascade;
drop function if exists private.accessible_comercial_ids() cascade;

alter table public.prospectos
  alter column comercial_id type uuid using comercial_id::uuid;
alter table public.actividades_ventas
  alter column comercial_id type uuid using comercial_id::uuid;
alter table public.tareas_ventas
  alter column comercial_id type uuid using comercial_id::uuid;
alter table public.leads
  alter column assigned_comercial_id type uuid using nullif(assigned_comercial_id, '')::uuid;
alter table public.leads
  alter column assigned_by_comercial_id type uuid using nullif(assigned_by_comercial_id, '')::uuid;
alter table public.marco_retributivo
  alter column updated_by type uuid using nullif(updated_by, '')::uuid;

alter table public.prospectos
  add constraint prospectos_comercial_id_fkey
  foreign key (comercial_id) references public.user_profiles (id) on delete restrict;
alter table public.actividades_ventas
  add constraint actividades_ventas_comercial_id_fkey
  foreign key (comercial_id) references public.user_profiles (id) on delete restrict;
alter table public.tareas_ventas
  add constraint tareas_ventas_comercial_id_fkey
  foreign key (comercial_id) references public.user_profiles (id) on delete restrict;
alter table public.leads
  add constraint leads_assigned_comercial_id_fkey
  foreign key (assigned_comercial_id) references public.user_profiles (id) on delete set null;
alter table public.leads
  add constraint leads_assigned_by_comercial_id_fkey
  foreign key (assigned_by_comercial_id) references public.user_profiles (id) on delete set null;
alter table public.marco_retributivo
  add constraint marco_retributivo_updated_by_fkey
  foreign key (updated_by) references public.user_profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Identity helpers (return uuid)
-- ---------------------------------------------------------------------------
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path to public, auth
as $$
  select exists (
    select 1
      from public.user_profiles
     where id = auth.uid()
       and role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')
  );
$$;

create or replace function private.current_comercial_id()
returns uuid
language sql
stable
security definer
set search_path to public, auth
as $$
  select id
    from public.user_profiles
   where id = auth.uid()
     and role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion');
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path to public, auth
as $$
  select coalesce(
    (select role from public.user_profiles where id = auth.uid()),
    private.jwt_user_role()
  );
$$;

create or replace function private.accessible_comercial_ids()
returns setof uuid
language sql
stable
security definer
set search_path to public, auth
as $$
  select id from public.user_profiles
  where role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')
    and (select private.current_role()) in ('superadmin', 'tramitacion')
  union
  select private.current_comercial_id()
  where private.current_comercial_id() is not null
  union
  select id from public.user_profiles
  where manager_id = private.current_comercial_id()
    and (select private.current_role()) = 'jefe_comercial';
$$;

create or replace function private.is_lead_manager()
returns boolean
language sql
stable
security definer
set search_path to public, auth
as $$
  select coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion', 'jefe_comercial');
$$;

create or replace function private.is_enersave_lead_manager()
returns boolean
language sql
stable
security definer
set search_path to public, auth
as $$
  select coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion');
$$;

create or replace function private.is_marco_retributivo_manager()
returns boolean
language sql
stable
security definer
set search_path to public, auth
as $$
  select coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion');
$$;

-- ---------------------------------------------------------------------------
-- 5. Recreate RLS
-- ---------------------------------------------------------------------------
drop policy if exists prospectos_select on public.prospectos;
create policy prospectos_select on public.prospectos
  for select to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()));

drop policy if exists prospectos_insert_authenticated on public.prospectos;
create policy prospectos_insert_authenticated on public.prospectos
  for insert to authenticated
  with check (
    comercial_id in (
      select id from public.user_profiles
      where role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')
    )
    and (
      comercial_id = (select private.current_comercial_id())
      or (select private.current_role()) in ('jefe_comercial', 'superadmin', 'tramitacion')
    )
  );

drop policy if exists prospectos_update on public.prospectos;
create policy prospectos_update on public.prospectos
  for update to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()))
  with check (comercial_id in (select private.accessible_comercial_ids()));

drop policy if exists prospectos_delete on public.prospectos;
create policy prospectos_delete on public.prospectos
  for delete to authenticated
  using (
    (select private.current_role()) in ('superadmin', 'jefe_comercial')
    or comercial_id = (select private.current_comercial_id())
  );

drop policy if exists actividades_ventas_select on public.actividades_ventas;
create policy actividades_ventas_select on public.actividades_ventas
  for select to authenticated
  using (
    prospecto_id in (
      select p.id from public.prospectos p
      where p.comercial_id in (select private.accessible_comercial_ids())
    )
  );

drop policy if exists actividades_ventas_insert on public.actividades_ventas;
create policy actividades_ventas_insert on public.actividades_ventas
  for insert to authenticated
  with check (
    prospecto_id in (
      select p.id from public.prospectos p
      where p.comercial_id in (select private.accessible_comercial_ids())
    )
    and (
      comercial_id = (select private.current_comercial_id())
      or (select private.current_role()) in ('jefe_comercial', 'superadmin', 'tramitacion')
    )
  );

drop policy if exists tareas_ventas_select on public.tareas_ventas;
create policy tareas_ventas_select on public.tareas_ventas
  for select to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()));

drop policy if exists tareas_ventas_insert on public.tareas_ventas;
create policy tareas_ventas_insert on public.tareas_ventas
  for insert to authenticated
  with check (comercial_id in (select private.accessible_comercial_ids()));

drop policy if exists tareas_ventas_update on public.tareas_ventas;
create policy tareas_ventas_update on public.tareas_ventas
  for update to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()))
  with check (comercial_id in (select private.accessible_comercial_ids()));

drop policy if exists tareas_ventas_delete on public.tareas_ventas;
create policy tareas_ventas_delete on public.tareas_ventas
  for delete to authenticated
  using (comercial_id in (select private.accessible_comercial_ids()));

drop policy if exists leads_select_authenticated on public.leads;
create policy leads_select_authenticated on public.leads
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or (select private.current_comercial_id()) is not null
  );

drop policy if exists facturas_select_authenticated on storage.objects;
create policy facturas_select_authenticated
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'facturas'
    and (
      (select private.current_comercial_id()) is not null
      or exists (
        select 1
        from public.leads l
        where l.auth_user_id = auth.uid()
          and name like (l.id::text || '/%')
      )
    )
  );

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
  on public.user_profiles
  for select to authenticated
  using (id = auth.uid() or private.is_staff());

-- ---------------------------------------------------------------------------
-- 6. Drop erp_comerciales
-- ---------------------------------------------------------------------------
drop policy if exists erp_comerciales_select on public.erp_comerciales;
drop policy if exists erp_comerciales_manage on public.erp_comerciales;
drop table if exists public.erp_comerciales cascade;

-- ---------------------------------------------------------------------------
-- 7. handle_new_user writes email
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  insert into public.user_profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    'customer',
    new.email
  )
  on conflict (id) do update
    set email = excluded.email
    where public.user_profiles.email is null;

  update public.leads
  set auth_user_id = new.id
  where auth_user_id is null
    and email is not null
    and lower(email) = lower(new.email);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPCs: prospectos / leads / directory / promote
-- ---------------------------------------------------------------------------
drop function if exists public.assign_web_lead_v1(uuid, text);
drop function if exists public.insert_prospecto_v1(jsonb);
drop function if exists public.delete_prospecto_v1(uuid);
drop function if exists public.insert_actividad_v1(jsonb);
drop function if exists public.convert_web_lead_to_prospecto_v1(uuid);
drop function if exists public.list_app_users_v1();

create or replace function public.insert_prospecto_v1(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_row public.prospectos;
  v_comercial_id uuid := nullif(payload ->> 'comercial_id', '')::uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_comercial_id is null or not exists (
    select 1 from public.user_profiles
    where id = v_comercial_id
      and role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')
  ) then
    raise exception 'invalid comercial_id' using errcode = '22023';
  end if;

  insert into public.prospectos (
    nombre_negocio, comercial_id, comercial_name, telefono, email, fase, cups,
    tipo_suministro, consumo_anual_kwh, compania_actual, tarifa_actual,
    direccion, poblacion, provincia, canal_origen, from_web, web_lead_id, metadata
  )
  values (
    payload ->> 'nombre_negocio',
    v_comercial_id,
    payload ->> 'comercial_name',
    payload ->> 'telefono',
    payload ->> 'email',
    coalesce(payload ->> 'fase', 'prospecto_nuevo'),
    payload ->> 'cups',
    payload ->> 'tipo_suministro',
    nullif(payload ->> 'consumo_anual_kwh', '')::numeric,
    payload ->> 'compania_actual',
    payload ->> 'tarifa_actual',
    payload ->> 'direccion',
    payload ->> 'poblacion',
    payload ->> 'provincia',
    coalesce(payload ->> 'canal_origen', 'manual'),
    coalesce((payload ->> 'from_web')::boolean, false),
    nullif(payload ->> 'web_lead_id', '')::uuid,
    coalesce(payload -> 'metadata', '{}'::jsonb)
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_prospecto_v1(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to public
as $$
declare
  v_row public.prospectos;
  v_role text;
  v_me uuid;
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
        select 1 from public.user_profiles up
        where up.id = v_row.comercial_id and up.manager_id = v_me
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

create or replace function public.insert_actividad_v1(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_row public.actividades_ventas;
  v_prospecto_id uuid := nullif(payload ->> 'prospecto_id', '')::uuid;
  v_comercial_id uuid := nullif(payload ->> 'comercial_id', '')::uuid;
  v_me uuid := (select private.current_comercial_id());
  v_role text := (select private.current_role());
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_prospecto_id is null then
    raise exception 'invalid prospecto_id' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.prospectos p
    where p.id = v_prospecto_id
      and (p.comercial_id = v_me or v_role in ('jefe_comercial', 'superadmin', 'tramitacion'))
  ) then
    raise exception 'forbidden prospecto' using errcode = '42501';
  end if;

  if v_comercial_id is null then
    v_comercial_id := v_me;
  end if;

  insert into public.actividades_ventas (
    prospecto_id, comercial_id, comercial_name, tipo, descripcion, titulo, metadata
  )
  values (
    v_prospecto_id,
    v_comercial_id,
    coalesce(payload ->> 'comercial_name', ''),
    payload ->> 'tipo',
    payload ->> 'descripcion',
    payload ->> 'titulo',
    coalesce(payload -> 'metadata', '{}'::jsonb)
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.assign_web_lead_v1(p_lead_id uuid, p_comercial_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_lead public.leads;
  v_me uuid := (select private.current_comercial_id());
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not (select private.is_lead_manager()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.user_profiles
    where id = p_comercial_id
      and role in ('superadmin', 'jefe_comercial', 'comercial', 'tramitacion')
  ) then
    raise exception 'invalid comercial_id' using errcode = '22023';
  end if;

  update public.leads
  set
    assigned_comercial_id = p_comercial_id,
    assigned_by_comercial_id = v_me,
    assigned_at = now(),
    status = coalesce(nullif(status, ''), 'nuevo')
  where id = p_lead_id
    and prospecto_id is null
  returning * into v_lead;

  if not found then
    raise exception 'lead not found or already converted' using errcode = '22023';
  end if;

  return to_jsonb(v_lead);
end;
$$;

create or replace function public.convert_web_lead_to_prospecto_v1(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_lead public.leads;
  v_comercial public.user_profiles;
  v_prospecto public.prospectos;
  v_metadata jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead not found' using errcode = '22023';
  end if;

  if v_lead.prospecto_id is not null then
    raise exception 'lead already converted' using errcode = '22023';
  end if;

  if v_lead.assigned_comercial_id is null then
    raise exception 'lead must be assigned before conversion' using errcode = '22023';
  end if;

  if not (
    (select private.is_lead_manager())
    or v_lead.assigned_comercial_id = (select private.current_comercial_id())
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_comercial from public.user_profiles where id = v_lead.assigned_comercial_id;
  if not found then
    raise exception 'invalid assigned comercial' using errcode = '22023';
  end if;

  v_metadata := jsonb_build_object(
    'lead_source', v_lead.lead_source,
    'facturas_urls', coalesce(v_lead.facturas_urls, '[]'::jsonb),
    'selected_tariff_id', v_lead.selected_tariff_id,
    'estimated_saving_monthly_eur', v_lead.estimated_saving_monthly_eur,
    'estimated_saving_percentage', v_lead.estimated_saving_percentage,
    'current_company', v_lead.current_company,
    'current_tariff_type', v_lead.current_tariff_type,
    'billing_period', v_lead.billing_period,
    'zip_code', v_lead.zip_code,
    'city', v_lead.city,
    'fiscal_address', v_lead.fiscal_address,
    'supply_address', v_lead.supply_address
  );

  insert into public.prospectos (
    nombre_negocio, comercial_id, comercial_name, telefono, email, fase, cups,
    compania_actual, tarifa_actual, consumo_anual_kwh, direccion, poblacion,
    provincia, canal_origen, from_web, web_lead_id, ahorro_estimado_anual, prioridad, metadata
  )
  values (
    v_lead.nombre,
    v_comercial.id,
    v_comercial.full_name,
    v_lead.telefono,
    v_lead.email,
    'prospecto_nuevo',
    v_lead.cups,
    v_lead.current_company,
    v_lead.current_tariff_type,
    null,
    coalesce(v_lead.supply_address, v_lead.fiscal_address),
    v_lead.city,
    null,
    coalesce(v_lead.lead_source, 'web'),
    true,
    v_lead.id,
    case
      when v_lead.estimated_saving_monthly_eur is not null
        then v_lead.estimated_saving_monthly_eur * 12
      else null
    end,
    'alta',
    v_metadata
  )
  returning * into v_prospecto;

  update public.leads
  set prospecto_id = v_prospecto.id, status = 'convertido', updated_at = now()
  where id = p_lead_id
  returning * into v_lead;

  return jsonb_build_object('lead', to_jsonb(v_lead), 'prospecto', to_jsonb(v_prospecto));
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
  left join auth.users au on au.id = up.id;
end;
$function$;

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

  if coalesce((select private.current_role()), '') not in ('superadmin', 'tramitacion') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_role not in ('customer', 'comercial', 'jefe_comercial', 'superadmin', 'tramitacion') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  if p_role = 'customer' then
    p_manager_id := null;
    v_commission := 0;
  elsif p_role = 'superadmin' then
    v_commission := 100;
  elsif p_role = 'jefe_comercial' then
    v_commission := 85;
  elsif p_role = 'tramitacion' then
    v_commission := 0;
  else
    v_commission := 60;
  end if;

  if p_manager_id is not null and not exists (
    select 1 from public.user_profiles
    where id = p_manager_id
      and role in ('superadmin', 'jefe_comercial')
  ) then
    raise exception 'invalid manager_id' using errcode = '22023';
  end if;

  update public.user_profiles
  set
    role = p_role,
    manager_id = p_manager_id,
    commission_percentage = v_commission,
    updated_at = now()
  where id = p_user_id
  returning * into v_row;

  if not found then
    raise exception 'user not found' using errcode = '22023';
  end if;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.insert_prospecto_v1(jsonb) to authenticated;
grant execute on function public.delete_prospecto_v1(uuid) to authenticated;
grant execute on function public.insert_actividad_v1(jsonb) to authenticated;
grant execute on function public.assign_web_lead_v1(uuid, uuid) to authenticated;
grant execute on function public.convert_web_lead_to_prospecto_v1(uuid) to authenticated;
grant execute on function public.list_app_users_v1() to authenticated;
grant execute on function public.assign_staff_role_v1(uuid, text, uuid) to authenticated;

revoke all on function public.assign_staff_role_v1(uuid, text, uuid) from public;
revoke all on function public.list_app_users_v1() from public;
