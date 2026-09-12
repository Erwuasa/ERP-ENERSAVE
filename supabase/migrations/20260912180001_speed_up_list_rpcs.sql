-- Tarifas: paginar antes de leer precios. Usuarios: sin join a auth.users.
-- Índices para el catálogo AT (~2.3k tarifas / ~12k precios).

create index if not exists tariffs_provider_id_idx
  on public.tariffs (provider_id);

create index if not exists tariffs_active_supply_idx
  on public.tariffs (is_active, supply_type)
  where is_active = true;

create index if not exists tariffs_active_supply_visible_idx
  on public.tariffs (is_active, supply_type, web_visible)
  where is_active = true;

create or replace function public.list_tariffs_catalog_v1(
  p_supply_type text default null,
  p_provider_name text default null,
  p_segment text default null,
  p_access_tariff text default null,
  p_web_visible boolean default null,
  p_search text default null,
  p_limit integer default 60,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
set search_path to public
as $function$
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
  counted as (
    select count(*)::bigint as total from filtered
  ),
  paged as (
    select f.*
    from filtered f
    order by f.name
    limit v_limit
    offset v_offset
  ),
  priced as (
    select
      pg.*,
      jsonb_build_object(
        'energia',
        coalesce(
          (
            select jsonb_object_agg('p' || substring(tp.period from 2), tp.energy_price_kwh)
            from public.tariff_prices tp
            where tp.tariff_id = pg.id
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
            where tp.tariff_id = pg.id
              and tp.power_price_kw_day is not null
              and tp.power_price_kw_day <> 0
          ),
          '{}'::jsonb
        )
      ) as prices_summary
    from paged pg
  ),
  summary as (
    select
      count(*) filter (where is_active and supply_type = 'luz') as luz_total,
      count(*) filter (where is_active and supply_type = 'gas') as gas_total,
      count(*) filter (where is_active and supply_type = 'luz' and web_visible) as luz_web_visible,
      count(*) filter (where is_active and supply_type = 'gas' and web_visible) as gas_web_visible,
      count(*) filter (where is_active and web_visible) as web_visible_total
    from public.tariffs
  ),
  provider_counts as (
    select coalesce(jsonb_object_agg(pc.provider_name, pc.cnt), '{}'::jsonb) as counts
    from (
      select p.name as provider_name, count(*)::bigint as cnt
      from public.tariffs t
      join public.providers p on p.id = t.provider_id
      where t.is_active = true
        and (p_supply_type is null or t.supply_type = p_supply_type)
      group by p.name
    ) pc
  )
  select jsonb_build_object(
    'total', (select total from counted),
    'limit', v_limit,
    'offset', v_offset,
    'has_more', (select total from counted) > (v_offset + v_limit),
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
        from priced
      ),
      '[]'::jsonb
    ),
    'provider_counts', (select counts from provider_counts),
    'summary', (
      select jsonb_build_object(
        'luz_total', luz_total,
        'gas_total', gas_total,
        'luz_web_visible', luz_web_visible,
        'gas_web_visible', gas_web_visible,
        'web_visible_total', web_visible_total
      )
      from summary
    )
  )
  into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$function$;

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
set search_path to public, pg_temp
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
    up.email,
    up.role,
    case when up.role = 'customer' then null else up.id::text end,
    up.manager_id::text,
    true,
    'account'::text
  from public.user_profiles up

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

create or replace function public.list_general_database_filter_options_v1()
returns jsonb
language sql
stable
security invoker
set search_path to public
as $function$
  select jsonb_build_object(
    'provincias', coalesce(
      (
        select jsonb_agg(v order by v)
        from (
          select distinct trim(provincia) as v
          from public.general_database_leads
          where provincia is not null and trim(provincia) <> ''
        ) s
      ),
      '[]'::jsonb
    ),
    'localidades', coalesce(
      (
        select jsonb_agg(v order by v)
        from (
          select distinct trim(localidad) as v
          from public.general_database_leads
          where localidad is not null and trim(localidad) <> ''
        ) s
      ),
      '[]'::jsonb
    ),
    'cnaes', coalesce(
      (
        select jsonb_agg(v order by v)
        from (
          select distinct trim(cnae) as v
          from public.general_database_leads
          where cnae is not null and trim(cnae) <> ''
        ) s
      ),
      '[]'::jsonb
    )
  );
$function$;

grant execute on function public.list_general_database_filter_options_v1() to authenticated;
