-- Fix: list_tariffs_catalog_v1 filtered every row by enertech_precios.segment, which the
-- Enertech sync always writes as 'residencial' (it never reports segment in its feed, see
-- AGENTS.md §8). That made the Productos screen's "Empresa" (pyme) filter return zero rows
-- for every company, including ones that genuinely are pyme-only (e.g. "NATURGY PYMES",
-- "NORDY PYMES", "REPSOL PYMES"), and made "Particular" (residencial) return every row
-- regardless of audience.
--
-- Same fix already applied on the TS side for the Comparador (src/lib/infer-erp-segment.ts,
-- src/lib/supabase/tariffs-catalog.ts): prioritize signals that are actually reliable before
-- falling back to the always-'residencial' stored column.
--   1) commercial/brand name or campaign name (e.g. "NATURGY PYMES" / "NATURGY RESIDENCIAL")
--   2) access tariff code (2.0TD -> residencial; 3.0TD/6.1TD/6.2TD -> pyme, per Spanish
--      regulation on contracted power bands)
--   3) stored `segment` column (last resort, known to always be 'residencial' today)
CREATE OR REPLACE FUNCTION public.list_tariffs_catalog_v1(p_supply_type text DEFAULT NULL::text, p_provider_name text DEFAULT NULL::text, p_segment text DEFAULT NULL::text, p_access_tariff text DEFAULT NULL::text, p_web_visible boolean DEFAULT NULL::boolean, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 60, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
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
      t.clave AS id,
      coalesce(t.payload->>'campania', t.payload->>'tarifa', t.clave) AS name,
      CASE WHEN t.payload->>'tarifa' ILIKE '%gas%' THEN 'gas' ELSE 'luz' END AS supply_type,
      coalesce(t.payload->>'tarifa', '') AS access_tariff,
      t.segment,
      t.web_visible,
      t.erp_active,
      t.web_alias,
      t.web_sort_order,
      t.pricing_model,
      t.is_indexed,
      null::uuid AS at_rate_id,
      ec.id::text AS provider_id,
      ec.nombre AS provider_name,
      CASE
        WHEN (coalesce(ec.nombre, '') || ' ' || coalesce(t.payload->>'campania', ''))
          ~* '\b(pymes?|negocios?|empresas?|business|industrial|comercio|oficina)\b'
          THEN 'pyme'
        WHEN (coalesce(ec.nombre, '') || ' ' || coalesce(t.payload->>'campania', ''))
          ~* '\b(hogar|residencial|residencia|particular|dom[eé]stic)\b'
          THEN 'residencial'
        WHEN coalesce(t.payload->>'tarifa', '') ILIKE '%2.0%' THEN 'residencial'
        WHEN coalesce(t.payload->>'tarifa', '') ILIKE '%3.0%'
          OR coalesce(t.payload->>'tarifa', '') ILIKE '%6.1%'
          OR coalesce(t.payload->>'tarifa', '') ILIKE '%6.2%' THEN 'pyme'
        ELSE t.segment
      END AS resolved_segment
    FROM public.enertech_precios t
    LEFT JOIN public.enertech_comercializadoras ec ON ec.nombre = t.payload->>'comercializadora'
    WHERE t.removed_at IS NULL
      AND (p_provider_name IS NULL OR ec.nombre = p_provider_name)
      AND (
        p_access_tariff IS NULL
        OR CASE
          WHEN p_access_tariff = '2.0TD' THEN coalesce(t.payload->>'tarifa','') ILIKE '%2.0%'
          WHEN p_access_tariff = '3.0TD' THEN coalesce(t.payload->>'tarifa','') ILIKE '%3.0%'
          ELSE coalesce(t.payload->>'tarifa','') ILIKE ('%' || replace(p_access_tariff, '.', '') || '%')
            OR coalesce(t.payload->>'tarifa','') = p_access_tariff
        END
      )
      AND (p_web_visible IS NULL OR t.web_visible = p_web_visible)
      AND (
        v_search IS NULL
        OR coalesce(t.payload->>'campania','') ILIKE ('%' || v_search || '%')
        OR coalesce(t.web_alias, '') ILIKE ('%' || v_search || '%')
        OR coalesce(ec.nombre, '') ILIKE ('%' || v_search || '%')
        OR coalesce(t.payload->>'tarifa','') ILIKE ('%' || v_search || '%')
      )
  ),
  segment_filtered AS (
    SELECT f.*
    FROM filtered f
    WHERE p_segment IS NULL OR f.resolved_segment = p_segment
  ),
  counted AS (
    SELECT count(*)::bigint AS total FROM segment_filtered
  ),
  paged AS (
    SELECT f.*
    FROM segment_filtered f
    ORDER BY f.name
    LIMIT v_limit
    OFFSET v_offset
  ),
  priced AS (
    SELECT
      pg.*,
      jsonb_build_object(
        'energia', coalesce((
          SELECT jsonb_object_agg(key, value)
          FROM (
            SELECT 'p' || substring(k FROM 2) AS key, (t.payload->>k)::numeric AS value
            FROM public.enertech_precios t, unnest(ARRAY['e1','e2','e3','e4','e5','e6']) AS k
            WHERE t.clave = pg.id AND t.payload->>k IS NOT NULL
          ) e), '{}'::jsonb
        ),
        'potencia', coalesce((
          SELECT jsonb_object_agg(key, value)
          FROM (
            SELECT 'p' || substring(k FROM 2) AS key, (t.payload->>k)::numeric AS value
            FROM public.enertech_precios t, unnest(ARRAY['p1','p2','p3','p4','p5','p6']) AS k
            WHERE t.clave = pg.id AND t.payload->>k IS NOT NULL
          ) p), '{}'::jsonb
        )
      ) AS prices_summary
    FROM paged pg
  ),
  summary AS (
    SELECT
      count(*) FILTER (WHERE removed_at IS NULL AND (payload->>'tarifa' NOT ILIKE '%gas%' OR payload->>'tarifa' IS NULL)) AS luz_total,
      count(*) FILTER (WHERE removed_at IS NULL AND payload->>'tarifa' ILIKE '%gas%') AS gas_total,
      count(*) FILTER (WHERE removed_at IS NULL AND web_visible AND (payload->>'tarifa' NOT ILIKE '%gas%' OR payload->>'tarifa' IS NULL)) AS luz_web_visible,
      count(*) FILTER (WHERE removed_at IS NULL AND web_visible AND payload->>'tarifa' ILIKE '%gas%') AS gas_web_visible,
      count(*) FILTER (WHERE removed_at IS NULL AND web_visible) AS web_visible_total
    FROM public.enertech_precios
  ),
  provider_counts AS (
    SELECT coalesce(jsonb_object_agg(pc.provider_name, pc.cnt), '{}'::jsonb) AS counts
    FROM (
      SELECT f.provider_name, count(*)::bigint AS cnt
      FROM segment_filtered f
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
$function$
