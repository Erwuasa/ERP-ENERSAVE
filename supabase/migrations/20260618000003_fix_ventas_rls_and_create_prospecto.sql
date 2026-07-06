-- Fix ventas RLS identity resolution + RPC insert for prospectos (bypasses strict WITH CHECK when helpers miss)

begin;

alter table public.erp_comerciales add column if not exists email text;

update public.erp_comerciales set email = 'carlos@enersave.com' where id = 'usr-1';
update public.erp_comerciales set email = 'elena@enersave.com' where id = 'usr-2';
update public.erp_comerciales set email = 'ignacio@enersave.com' where id = 'usr-3';
update public.erp_comerciales set email = 'marta@enersave.com' where id = 'usr-4';
update public.erp_comerciales set email = 'santiago@enersave.com' where id = 'usr-5';

create or replace function private.email_comercial_id(p_email text)
returns text
language sql
immutable
as $$
  select case lower(trim(p_email))
    when 'carlos@enersave.com' then 'usr-1'
    when 'elena@enersave.com' then 'usr-2'
    when 'ignacio@enersave.com' then 'usr-3'
    when 'marta@enersave.com' then 'usr-4'
    when 'santiago@enersave.com' then 'usr-5'
    else null
  end;
$$;

create or replace function private.email_comercial_role(p_email text)
returns text
language sql
immutable
as $$
  select case lower(trim(p_email))
    when 'carlos@enersave.com' then 'superadmin'
    when 'elena@enersave.com' then 'jefe_comercial'
    when 'ignacio@enersave.com' then 'comercial'
    when 'marta@enersave.com' then 'comercial'
    when 'santiago@enersave.com' then 'comercial'
    else null
  end;
$$;

create or replace function private.current_comercial_id()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'comercial_id',
    auth.jwt() -> 'user_metadata' ->> 'comercial_id',
    (select ec.id from public.erp_comerciales ec where ec.auth_user_id = auth.uid()),
    (
      select ec.id
      from public.erp_comerciales ec
      where ec.email is not null
        and lower(ec.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    ),
    private.email_comercial_id(auth.jwt() ->> 'email')
  );
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    (select ec.role from public.erp_comerciales ec where ec.auth_user_id = auth.uid()),
    (
      select ec.role
      from public.erp_comerciales ec
      where ec.email is not null
        and lower(ec.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    ),
    (
      select ec.role
      from public.erp_comerciales ec
      where ec.id = (select private.current_comercial_id())
    ),
    private.email_comercial_role(auth.jwt() ->> 'email')
  );
$$;

drop policy if exists prospectos_insert_authenticated on public.prospectos;

create policy prospectos_insert_authenticated
  on public.prospectos
  for insert
  to authenticated
  with check (
    comercial_id in (select id from public.erp_comerciales)
    and (
      comercial_id = (select private.current_comercial_id())
      or (select private.current_role()) in ('jefe_comercial', 'superadmin')
    )
  );

create or replace function public.insert_prospecto_v1(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.prospectos;
  v_comercial_id text := payload ->> 'comercial_id';
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_comercial_id is null or not exists (
    select 1 from public.erp_comerciales where id = v_comercial_id
  ) then
    raise exception 'invalid comercial_id' using errcode = '22023';
  end if;

  insert into public.prospectos (
    nombre_negocio,
    comercial_id,
    comercial_name,
    telefono,
    email,
    fase,
    cups,
    tipo_suministro,
    consumo_anual_kwh,
    compania_actual,
    tarifa_actual,
    direccion,
    poblacion,
    provincia,
    metadata
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
    coalesce(payload -> 'metadata', '{}'::jsonb)
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.insert_prospecto_v1(jsonb) from public;
grant execute on function public.insert_prospecto_v1(jsonb) to authenticated;

commit;
