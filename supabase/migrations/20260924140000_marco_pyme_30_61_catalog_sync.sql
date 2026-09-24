-- Enlaza marco retributivo PYME 3.0 / 6.x con tarifas ERP activas y crea filas faltantes.

begin;

create or replace function private.norm_compania_key(t text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(t, ''), '[^a-z0-9]', '', 'gi'));
$$;

create or replace function private.norm_tarifa_key(t text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(t, ''), '[^a-z0-9]', '', 'gi'));
$$;

create or replace function private.tariff_peaje_label(access_tariff text)
returns text
language plpgsql
immutable
as $$
declare
  u text := upper(coalesce(access_tariff, ''));
  m text[];
begin
  if u like '%2.0%' then
    return '2.0TD';
  end if;
  if u like '%3.0%' and u not like '%6.%' then
    return '3.0TD';
  end if;
  m := regexp_match(u, '6\.([0-9])');
  if m is not null then
    return '6.' || m[1] || 'TD';
  end if;
  if u like '%6.%' then
    return '6.1TD';
  end if;
  return 'Todas';
end;
$$;

-- 1) Enlazar marco existente → tarifa ERP por compañía + nombre aproximado + peaje compatible
with candidates as (
  select
    m.id as marco_id,
    t.id as tariff_id,
    row_number() over (
      partition by m.id
      order by length(t.name) asc, t.id
    ) as rn
  from marco_retributivo m
  inner join tariffs t
    on t.is_active
   and t.erp_active
   and t.segment = m.segmento
  inner join providers p on p.id = t.provider_id
  where m.activo
    and m.tariff_id is null
    and m.segmento = 'pyme'
    and (
      m.peaje ilike '%3.0%'
      or m.peaje ilike '%6.%'
      or m.peaje = 'Todas'
    )
    and (
      t.access_tariff ilike '%3.0%'
      or t.access_tariff ilike '%6.%'
    )
    and private.norm_compania_key(p.name) = private.norm_compania_key(m.compania)
    and (
      private.norm_tarifa_key(t.name) like '%' || private.norm_tarifa_key(m.tarifa) || '%'
      or private.norm_tarifa_key(m.tarifa) like '%' || left(private.norm_tarifa_key(t.name), 12) || '%'
      or lower(t.name) like '%' || lower(trim(split_part(m.tarifa, '/', 1))) || '%'
    )
    and (
      m.peaje = 'Todas'
      or upper(t.access_tariff) like '%' || replace(upper(m.peaje), 'TD', '') || '%'
      or upper(m.peaje) like '%' || regexp_replace(upper(t.access_tariff), '[^0-9.]', '', 'g') || '%'
    )
)
update marco_retributivo m
set
  tariff_id = c.tariff_id,
  updated_at = now(),
  condiciones = coalesce(m.condiciones, '') || ' [tariff_id sync 2026-09-24]'
from candidates c
where m.id = c.marco_id
  and c.rn = 1;

-- 2) Crear marco para tarifas PYME 3.0 / 6.x sin fila activa enlazada
insert into marco_retributivo (
  compania,
  tarifa,
  tipo,
  peaje,
  segmento,
  comision_tipo,
  comision_base,
  comision_unidad,
  vigencia_meses,
  fecha_inicio,
  activo,
  tariff_id,
  at_rate_id,
  source,
  condicion_2,
  condiciones
)
select
  p.name,
  t.name,
  case when t.supply_type = 'gas' then 'gas' else 'luz' end,
  private.tariff_peaje_label(t.access_tariff),
  t.segment,
  'fija',
  0,
  'eur_cups',
  12,
  current_date,
  true,
  t.id,
  t.at_rate_id,
  'manual',
  'Tarifario ERP',
  'Alta automática desde catálogo ERP (PYME 3.0 / 6.x)'
from tariffs t
inner join providers p on p.id = t.provider_id
where t.is_active
  and t.erp_active
  and t.segment = 'pyme'
  and (
    (t.access_tariff ilike '%3.0%' and t.access_tariff not ilike '%6.%')
    or t.access_tariff ilike '%6.%'
  )
  and not exists (
    select 1
    from marco_retributivo m
    where m.activo
      and m.tariff_id = t.id
  )
  and not exists (
    select 1
    from marco_retributivo m
    where m.activo
      and m.segmento = t.segment
      and private.norm_compania_key(m.compania) = private.norm_compania_key(p.name)
      and private.norm_tarifa_key(m.tarifa) = private.norm_tarifa_key(t.name)
  );

commit;
