-- Repair ventas schema columns missing on brownfield Supabase + RPC updates

begin;

alter table public.actividades_ventas add column if not exists titulo text;
alter table public.actividades_ventas add column if not exists descripcion text;
alter table public.actividades_ventas add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.prospectos add column if not exists fecha_proximo_contacto date;
alter table public.prospectos add column if not exists subtipo_prospecto text;
alter table public.prospectos add column if not exists sub_estado text;
alter table public.prospectos add column if not exists motivo_con_dudas text;
alter table public.prospectos add column if not exists motivo_recontacto text;
alter table public.prospectos add column if not exists fecha_recontactar date;
alter table public.prospectos add column if not exists motivo_descarte text;
alter table public.prospectos add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace function public.update_prospecto_v1(p_id uuid, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.prospectos;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.prospectos
  set
    nombre_negocio = coalesce(payload ->> 'nombre_negocio', nombre_negocio),
    telefono = coalesce(payload ->> 'telefono', telefono),
    email = coalesce(payload ->> 'email', email),
    fase = coalesce(payload ->> 'fase', fase),
    cups = coalesce(payload ->> 'cups', cups),
    tipo_suministro = coalesce(payload ->> 'tipo_suministro', tipo_suministro),
    consumo_anual_kwh = coalesce(nullif(payload ->> 'consumo_anual_kwh', '')::numeric, consumo_anual_kwh),
    compania_actual = coalesce(payload ->> 'compania_actual', compania_actual),
    tarifa_actual = coalesce(payload ->> 'tarifa_actual', tarifa_actual),
    direccion = coalesce(payload ->> 'direccion', direccion),
    poblacion = coalesce(payload ->> 'poblacion', poblacion),
    provincia = coalesce(payload ->> 'provincia', provincia),
    metadata = coalesce(payload -> 'metadata', metadata),
    fecha_proximo_contacto = coalesce(
      nullif(payload ->> 'fecha_proximo_contacto', '')::date,
      nullif(payload -> 'metadata' ->> 'fecha_proximo_contacto', '')::date,
      fecha_proximo_contacto
    ),
    subtipo_prospecto = coalesce(
      payload ->> 'subtipo_prospecto',
      payload -> 'metadata' ->> 'subtipo_prospecto',
      subtipo_prospecto
    ),
    updated_at = now()
  where id = p_id
  returning * into v_row;

  if not found then
    return null;
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.update_prospecto_v1(uuid, jsonb) from public;
grant execute on function public.update_prospecto_v1(uuid, jsonb) to authenticated;

commit;
