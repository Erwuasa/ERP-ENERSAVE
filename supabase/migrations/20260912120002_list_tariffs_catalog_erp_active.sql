-- Incluir erp_active en listado de catálogo de tarifas
CREATE OR REPLACE FUNCTION public.list_tariffs_catalog_v1(
  p_supply_type text DEFAULT NULL,
  p_provider_name text DEFAULT NULL,
  p_segment text DEFAULT NULL,
  p_access_tariff text DEFAULT NULL,
  p_web_visible boolean DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 60,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 60), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  with filtered as (
    select
      t.id,
      t.name,
      t.supply_type,
      t.access_tariff,
      t.segment,
      t.web_visible,
      t.erp_active,
      t.web_alias,
      t.web_sort_order,
      t.pricing_model,
      t.is_indexed,
      t.at_rate_id,
      p.id as provider_id,
      p.name as provider_name
    from public.tariffs t
    left join public.providers p on p.id = t.provider_id
    where t.is_active = true
      and (p_supply_type is null or t.supply_type = p_supply_type)
      and (p_provider_name is null or p.name = p_provider_name)
      and (p_segment is null or t.segment = p_segment)
      and (
        p_access_tariff is null
        or case
          when p_access_tariff = '2.0TD' then t.access_tariff ilike '%2.0%'
          when p_access_tariff = '3.0TD' then t.access_tariff ilike '%3.0%'
          else t.access_tariff ilike ('%' || replace(p_access_tariff, '.', '') || '%')
            or t.access_tariff = p_access_tariff
        end
      )
      and (p_web_visible is null or t.web_visible = p_web_visible)
      and (
        v_search is null
        or t.name ilike ('%' || v_search || '%')
        or coalesce(t.web_alias, '') ilike ('%' || v_search || '%')
        or coalesce(p.name, '') ilike ('%' || v_search || '%')
        or t.access_tariff ilike ('%' || v_search || '%')
      )
  ),
  priced as (
    select
      f.*,
      jsonb_build_object(
        'energia',
        coalesce(
          (
            select jsonb_object_agg('p' || substring(tp.period from 2), tp.energy_price_kwh)
            from public.tariff_prices tp
            where tp.tariff_id = f.id
              and tp.energy_price_kwh is not null
              and tp.energy_price_kwh <> 0
          ),
          '{}'::jsonb
        ),
        'potencia',
        coalesce(
          (
            select jsonb_object_agg('p' || substring(tp.period from 2), tp.power_price_kw_day)
            from public.tariff_prices tp
            where tp.tariff_id = f.id
              and tp.power_price_kw_day is not null
              and tp.power_price_kw_day <> 0
          ),
          '{}'::jsonb
        )
      ) as prices_summary
    from filtered f
  ),
  paged as (
    select *
    from priced
    order by name
    limit v_limit
    offset v_offset
  )
  select jsonb_build_object(
    'total', (select count(*)::bigint from priced),
    'limit', v_limit,
    'offset', v_offset,
    'has_more', (v_offset + v_limit) < (select count(*) from priced),
    'rows', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'supply_type', supply_type,
            'access_tariff', access_tariff,
            'segment', segment,
            'web_visible', web_visible,
            'erp_active', erp_active,
            'web_alias', web_alias,
            'web_sort_order', web_sort_order,
            'pricing_model', pricing_model,
            'is_indexed', is_indexed,
            'at_rate_id', at_rate_id,
            'provider_id', provider_id,
            'provider_name', provider_name,
            'prices_summary', prices_summary
          )
          order by name
        )
        from paged
      ),
      '[]'::jsonb
    ),
    'provider_counts', coalesce(
      (
        select jsonb_object_agg(pc.provider_name, pc.cnt)
        from (
          select p.name as provider_name, count(*)::bigint as cnt
          from public.tariffs t
          join public.providers p on p.id = t.provider_id
          where t.is_active = true
            and (p_supply_type is null or t.supply_type = p_supply_type)
          group by p.name
        ) pc
      ),
      '{}'::jsonb
    ),
    'summary', jsonb_build_object(
      'luz_total',
      (select count(*) from public.tariffs where is_active and supply_type = 'luz'),
      'gas_total',
      (select count(*) from public.tariffs where is_active and supply_type = 'gas'),
      'luz_web_visible',
      (select count(*) from public.tariffs where is_active and supply_type = 'luz' and web_visible),
      'gas_web_visible',
      (select count(*) from public.tariffs where is_active and supply_type = 'gas' and web_visible),
      'web_visible_total',
      (select count(*) from public.tariffs where is_active and web_visible)
    )
  )
  into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$function$;
