-- provider_counts debe usar los mismos filtros que el listado (segmento, peaje, búsqueda…).
-- Reclasificar tarifas PYME-only mal marcadas como residencial (Ignis, Reazziona, Eleia).

UPDATE public.tariffs t
SET segment = 'pyme'
FROM public.providers p
WHERE t.provider_id = p.id
  AND t.is_active = true
  AND t.segment = 'residencial'
  AND lower(trim(p.name)) IN ('ignis', 'reazziona', 'eleia');

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
DECLARE
  v_limit integer := greatest(1, least(coalesce(p_limit, 60), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  WITH filtered AS (
    SELECT
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
      p.id AS provider_id,
      p.name AS provider_name
    FROM public.tariffs t
    LEFT JOIN public.providers p ON p.id = t.provider_id
    WHERE t.is_active = true
      AND (p_supply_type IS NULL OR t.supply_type = p_supply_type)
      AND (p_provider_name IS NULL OR p.name = p_provider_name)
      AND (p_segment IS NULL OR t.segment = p_segment)
      AND (
        p_access_tariff IS NULL
        OR CASE
          WHEN p_access_tariff = '2.0TD' THEN t.access_tariff ILIKE '%2.0%'
          WHEN p_access_tariff = '3.0TD' THEN t.access_tariff ILIKE '%3.0%'
          ELSE t.access_tariff ILIKE ('%' || replace(p_access_tariff, '.', '') || '%')
            OR t.access_tariff = p_access_tariff
        END
      )
      AND (p_web_visible IS NULL OR t.web_visible = p_web_visible)
      AND (
        v_search IS NULL
        OR t.name ILIKE ('%' || v_search || '%')
        OR coalesce(t.web_alias, '') ILIKE ('%' || v_search || '%')
        OR coalesce(p.name, '') ILIKE ('%' || v_search || '%')
        OR t.access_tariff ILIKE ('%' || v_search || '%')
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS total FROM filtered
  ),
  paged AS (
    SELECT f.*
    FROM filtered f
    ORDER BY f.name
    LIMIT v_limit
    OFFSET v_offset
  ),
  priced AS (
    SELECT
      pg.*,
      jsonb_build_object(
        'energia',
        coalesce(
          (
            SELECT jsonb_object_agg('p' || substring(tp.period FROM 2), tp.energy_price_kwh)
            FROM public.tariff_prices tp
            WHERE tp.tariff_id = pg.id
              AND tp.energy_price_kwh IS NOT NULL
              AND tp.energy_price_kwh <> 0
          ),
          '{}'::jsonb
        ),
        'potencia',
        coalesce(
          (
            SELECT jsonb_object_agg('p' || substring(tp.period FROM 2), tp.power_price_kw_day)
            FROM public.tariff_prices tp
            WHERE tp.tariff_id = pg.id
              AND tp.power_price_kw_day IS NOT NULL
              AND tp.power_price_kw_day <> 0
          ),
          '{}'::jsonb
        )
      ) AS prices_summary
    FROM paged pg
  ),
  summary AS (
    SELECT
      count(*) FILTER (WHERE is_active AND supply_type = 'luz') AS luz_total,
      count(*) FILTER (WHERE is_active AND supply_type = 'gas') AS gas_total,
      count(*) FILTER (WHERE is_active AND supply_type = 'luz' AND web_visible) AS luz_web_visible,
      count(*) FILTER (WHERE is_active AND supply_type = 'gas' AND web_visible) AS gas_web_visible,
      count(*) FILTER (WHERE is_active AND web_visible) AS web_visible_total
    FROM public.tariffs
  ),
  provider_counts AS (
    SELECT coalesce(jsonb_object_agg(pc.provider_name, pc.cnt), '{}'::jsonb) AS counts
    FROM (
      SELECT f.provider_name, count(*)::bigint AS cnt
      FROM filtered f
      WHERE f.provider_name IS NOT NULL
      GROUP BY f.provider_name
    ) pc
  )
  SELECT jsonb_build_object(
    'total', (SELECT total FROM counted),
    'limit', v_limit,
    'offset', v_offset,
    'has_more', (SELECT total FROM counted) > (v_offset + v_limit),
    'rows', coalesce(
      (
        SELECT jsonb_agg(
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
          ORDER BY name
        )
        FROM priced
      ),
      '[]'::jsonb
    ),
    'provider_counts', (SELECT counts FROM provider_counts),
    'summary', (
      SELECT jsonb_build_object(
        'luz_total', luz_total,
        'gas_total', gas_total,
        'luz_web_visible', luz_web_visible,
        'gas_web_visible', gas_web_visible,
        'web_visible_total', web_visible_total
      )
      FROM summary
    )
  )
  INTO v_result;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$function$;
