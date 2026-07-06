-- Fix actividades_ventas RLS (comentarios en pipeline / centro de mando)
-- + RPC insert_actividad_v1 (evita fallo INSERT+SELECT bajo RLS estricto)

begin;

create or replace function private.accessible_comercial_ids()
returns setof text
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from public.erp_comerciales
  where (select private.current_role()) = 'superadmin'
  union
  select private.current_comercial_id()
  where private.current_comercial_id() is not null
  union
  select id from public.erp_comerciales
  where manager_id = private.current_comercial_id()
    and (select private.current_role()) = 'jefe_comercial';
$$;

alter table public.actividades_ventas enable row level security;

drop policy if exists actividades_ventas_select on public.actividades_ventas;
drop policy if exists actividades_ventas_insert on public.actividades_ventas;
drop policy if exists actividades_select_authenticated on public.actividades_ventas;
drop policy if exists actividades_insert_authenticated on public.actividades_ventas;

create policy actividades_ventas_select on public.actividades_ventas
  for select
  to authenticated
  using (
    prospecto_id in (
      select p.id
      from public.prospectos p
      where p.comercial_id in (select private.accessible_comercial_ids())
    )
  );

create policy actividades_ventas_insert on public.actividades_ventas
  for insert
  to authenticated
  with check (
    prospecto_id in (
      select p.id
      from public.prospectos p
      where p.comercial_id in (select private.accessible_comercial_ids())
    )
    and (
      comercial_id = (select private.current_comercial_id())
      or (select private.current_role()) in ('jefe_comercial', 'superadmin')
    )
  );

create or replace function public.insert_actividad_v1(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.actividades_ventas;
  v_prospecto_id uuid := nullif(payload ->> 'prospecto_id', '')::uuid;
  v_comercial_id text := payload ->> 'comercial_id';
  v_me text := (select private.current_comercial_id());
  v_role text := (select private.current_role());
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_prospecto_id is null then
    raise exception 'invalid prospecto_id' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.prospectos p
    where p.id = v_prospecto_id
      and (
        p.comercial_id = v_me
        or v_role in ('jefe_comercial', 'superadmin')
      )
  ) then
    raise exception 'forbidden prospecto' using errcode = '42501';
  end if;

  if v_comercial_id is null or v_comercial_id = '' then
    v_comercial_id := v_me;
  end if;

  insert into public.actividades_ventas (
    prospecto_id,
    comercial_id,
    comercial_name,
    tipo,
    descripcion,
    titulo,
    metadata
  )
  values (
    v_prospecto_id,
    v_comercial_id,
    payload ->> 'comercial_name',
    payload ->> 'tipo',
    payload ->> 'descripcion',
    payload ->> 'titulo',
    coalesce(payload -> 'metadata', '{}'::jsonb)
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.insert_actividad_v1(jsonb) from public;
grant execute on function public.insert_actividad_v1(jsonb) to authenticated;

commit;
