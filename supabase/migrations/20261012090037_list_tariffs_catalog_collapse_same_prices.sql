-- La pantalla de tarifas lista cada fila de enertech_precios. Enertech repite la misma
-- oferta por territorio (península, Baleares, Canarias) y, a veces, por tramo, con los
-- mismos precios de energía y potencia. Esas copias se ven como tarifas duplicadas.
-- Aquí se deja una sola fila por compañía + nombre + peaje + segmento + precios.
-- Si el precio cambia, las dos filas siguen. Se prefiere península.
-- También se recupera el filtro p_supply_type, que la migración del segmento había dejado
-- sin usar, y el segmento que ve la UI es el resuelto (nombre → peaje → columna).

CREATE OR REPLACE FUNCTION public.list_tariffs_catalog_v1(
  p_supply_type text DEFAULT NULL::text,
  p_provider_name text DEFAULT NULL::text,
  p_segment text DEFAULT NULL::text,
  p_access_tariff text DEFAULT NULL::text,
  p_web_visible boolean DEFAULT NULL::boolean,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 60,
  p_offset integer DEFAULT 0
)
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

  WITH candidates AS (
    SELECT
      t.clave AS id,
      coalesce(t.payload->>'campania', t.payload->>'tarifa', t.clave) AS name,
      CASE WHEN t.payload->>'tarifa' ILIKE '%gas%' THEN 'gas' ELSE 'luz' END AS supply_type,
      coalesce(t.payload->>'tarifa', '') AS access_tariff,
      t.web_visible,
      t.erp_active,
      t.web_alias,
      t.web_sort_order,
      t.pricing_model,
      t.is_indexed,
      null::uuid AS at_rate_id,
      ec.id::text AS provider_id,
      coalesce(ec.nombre, nullif(btrim(t.payload->>'comercializadora'), '')) AS provider_name,
      CASE
        WHEN (coalesce(ec.nombre, t.payload->>'comercializadora', '') || ' ' || coalesce(t.payload->>'campania', ''))
          ~* '\b(pymes?|negocios?|empresas?|business|industrial|comercio|oficina)\b'
          THEN 'pyme'
        WHEN (coalesce(ec.nombre, t.payload->>'comercializadora', '') || ' ' || coalesce(t.payload->>'campania', ''))
          ~* '\b(hogar|residencial|residencia|particular|dom[eé]stic)\b'
          THEN 'residencial'
        WHEN coalesce(t.payload->>'tarifa', '') ILIKE '%2.0%' THEN 'residencial'
        WHEN coalesce(t.payload->>'tarifa', '') ILIKE '%3.0%'
          OR coalesce(t.payload->>'tarifa', '') ILIKE '%6.1%'
          OR coalesce(t.payload->>'tarifa', '') ILIKE '%6.2%' THEN 'pyme'
        ELSE t.segment
      END AS resolved_segment,
      concat_ws('|',
        coalesce(nullif(t.payload->>'e1', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'e2', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'e3', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'e4', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'e5', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'e6', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'p1', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'p2', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'p3', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'p4', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'p5', '')::numeric::text, ''),
        coalesce(nullif(t.payload->>'p6', '')::numeric::text, '')
      ) AS price_sig,
      CASE lower(btrim(coalesce(t.payload->>'territorio', '')))
        WHEN 'peninsula' THEN 0
        WHEN 'península' THEN 0
        WHEN 'baleares' THEN 1
        WHEN 'canarias' THEN 2
        ELSE 3
      END AS territory_rank
    FROM public.enertech_precios t
    LEFT JOIN public.enertech_comercializadoras ec
      ON lower(ec.nombre) = lower(btrim(t.payload->>'comercializadora'))
    WHERE t.removed_at IS NULL
  ),
  collapsed AS (
    SELECT DISTINCT ON (
      lower(btrim(coalesce(provider_name, ''))),
      lower(btrim(name)),
      lower(btrim(access_tariff)),
      resolved_segment,
      supply_type,
      price_sig
    )
      id,
      name,
      supply_type,
      access_tariff,
      resolved_segment AS segment,
      resolved_segment,
      web_visible,
      erp_active,
      web_alias,
      web_sort_order,
      pricing_model,
      is_indexed,
      at_rate_id,
      provider_id,
      provider_name
    FROM candidates
    ORDER BY
      lower(btrim(coalesce(provider_name, ''))),
      lower(btrim(name)),
      lower(btrim(access_tariff)),
      resolved_segment,
      supply_type,
      price_sig,
      territory_rank,
      id
  ),
  filtered AS (
    SELECT c.*
    FROM collapsed c
    WHERE (p_supply_type IS NULL OR c.supply_type = p_supply_type)
      AND (p_provider_name IS NULL OR c.provider_name = p_provider_name)
      AND (
        p_access_tariff IS NULL
        OR CASE
          WHEN p_access_tariff = '2.0TD' THEN c.access_tariff ILIKE '%2.0%'
          WHEN p_access_tariff = '3.0TD' THEN c.access_tariff ILIKE '%3.0%'
          ELSE c.access_tariff ILIKE ('%' || replace(p_access_tariff, '.', '') || '%')
            OR c.access_tariff = p_access_tariff
        END
      )
      AND (p_web_visible IS NULL OR c.web_visible = p_web_visible)
      AND (
        v_search IS NULL
        OR c.name ILIKE ('%' || v_search || '%')
        OR coalesce(c.web_alias, '') ILIKE ('%' || v_search || '%')
        OR coalesce(c.provider_name, '') ILIKE ('%' || v_search || '%')
        OR c.access_tariff ILIKE ('%' || v_search || '%')
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
      count(*) FILTER (WHERE supply_type = 'luz') AS luz_total,
      count(*) FILTER (WHERE supply_type = 'gas') AS gas_total,
      count(*) FILTER (WHERE supply_type = 'luz' AND web_visible) AS luz_web_visible,
      count(*) FILTER (WHERE supply_type = 'gas' AND web_visible) AS gas_web_visible,
      count(*) FILTER (WHERE web_visible) AS web_visible_total
    FROM collapsed
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
