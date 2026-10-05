-- Rescate: marco activo sin tariff_id → provider + tariff + precios (dummy si no hay P1–P6).
-- Altas manuales: seguir docs/marco-tariff-insert-template.sql (tariff_id explícito en paso 4).
-- No usar este backfill como flujo principal si el marco lleva tramos y precios reales en tariff_prices.

CREATE OR REPLACE FUNCTION public.marco_compania_to_provider_name(p_compania text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(p_compania)
    WHEN 'Todo Plenitude (Digital Energy)' THEN 'Plenitude'
    WHEN 'Neon' THEN 'Neón'
    WHEN 'Imagina Energia' THEN 'Imagina Energía'
    WHEN 'Iner Energia' THEN 'Iner Energía'
    WHEN 'Gana Energia' THEN 'Gana Energía'
    WHEN 'Opcion Energia' THEN 'Opción Energía'
    WHEN 'Total Energies' THEN 'TotalEnergies'
    WHEN 'Eleia' THEN 'Eleia'
    ELSE trim(p_compania)
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_provider_id(
  p_name text,
  OUT provider_id uuid,
  OUT created boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_name text := trim(p_name);
BEGIN
  created := false;
  provider_id := NULL;
  IF v_name = '' THEN
    RETURN;
  END IF;

  SELECT p.id INTO provider_id
  FROM public.providers p
  WHERE lower(trim(p.name)) = lower(v_name)
  ORDER BY (p.is_active IS TRUE) DESC, p.name ASC
  LIMIT 1;

  IF provider_id IS NOT NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.providers (name, is_active)
  VALUES (v_name, true)
  RETURNING id INTO provider_id;

  created := true;
END;
$$;

-- Tramos AT legacy: min_mwh / max_mwh / comision → desde_kwh / hasta_kwh / comision_base
UPDATE public.marco_retributivo m
SET
  tramos = sub.normalized,
  updated_at = now()
FROM (
  SELECT
    mr.id,
    COALESCE(
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'desde_kwh',
            round((NULLIF(elem->>'min_mwh', '')::numeric * 1000)),
            'hasta_kwh',
            CASE
              WHEN NULLIF(elem->>'max_mwh', '')::numeric >= 9999 THEN 999999999
              ELSE round((NULLIF(elem->>'max_mwh', '')::numeric * 1000))
            END,
            'comision_base',
            COALESCE(
              NULLIF(elem->>'comision_base', '')::numeric,
              NULLIF(elem->>'comision', '')::numeric
            ),
            'unidad',
            COALESCE(NULLIF(elem->>'unidad', ''), mr.comision_unidad),
            'condicion',
            NULLIF(elem->>'condicion', '')
          )
        )
      ) FILTER (WHERE elem ? 'min_mwh'),
      '[]'::jsonb
    ) AS normalized
  FROM public.marco_retributivo mr
  CROSS JOIN LATERAL jsonb_array_elements(mr.tramos) AS elem
  WHERE jsonb_array_length(mr.tramos) > 0
    AND (mr.tramos->0) ? 'min_mwh'
  GROUP BY mr.id
) sub
WHERE m.id = sub.id
  AND sub.normalized <> '[]'::jsonb;

-- Un tramo desde condicion_2 (rango MWh) cuando tramos está vacío
UPDATE public.marco_retributivo m
SET
  tramos = jsonb_build_array(
    jsonb_strip_nulls(
      jsonb_build_object(
        'desde_kwh',
        round(replace(src.desde_mwh, ',', '.')::numeric * 1000),
        'hasta_kwh',
        CASE
          WHEN replace(src.hasta_mwh, ',', '.')::numeric >= 9999 THEN 999999999
          ELSE round(replace(src.hasta_mwh, ',', '.')::numeric * 1000)
        END,
        'comision_base',
        m.comision_base,
        'unidad',
        m.comision_unidad,
        'condicion',
        trim(m.condicion_2)
      )
    )
  ),
  at_kwh_min = round(replace(src.desde_mwh, ',', '.')::numeric * 1000),
  at_kwh_max = CASE
    WHEN replace(src.hasta_mwh, ',', '.')::numeric >= 9999 THEN 999999999
    ELSE round(replace(src.hasta_mwh, ',', '.')::numeric * 1000)
  END,
  updated_at = now()
FROM (
  SELECT
    mr.id,
    m1[1] AS desde_mwh,
    m1[2] AS hasta_mwh
  FROM public.marco_retributivo mr
  CROSS JOIN LATERAL regexp_match(
    mr.condicion_2,
    '(\d+(?:[.,]\d+)?)\s*(?:–|-|a|\.\.\.)\s*(\d+(?:[.,]\d+)?)\s*MWh',
    'i'
  ) AS m1
  WHERE mr.activo = true
    AND (mr.tramos IS NULL OR mr.tramos = '[]'::jsonb OR jsonb_array_length(mr.tramos) = 0)
    AND mr.condicion_2 ~* '\d+\s*(?:–|-|a|\.\.\.)\s*\d+\s*MWh'
    AND m1 IS NOT NULL
) src
WHERE m.id = src.id;

-- condicion_2 = rango anual; condicion_1 = campaña / notas (no mover tramo a condicion_1)
UPDATE public.marco_retributivo m
SET
  condicion_2 = COALESCE(
    NULLIF(trim(m.condicion_2), ''),
    (m.tramos->0->>'condicion')
  ),
  updated_at = now()
WHERE m.activo = true
  AND jsonb_array_length(COALESCE(m.tramos, '[]'::jsonb)) = 1
  AND (
    m.condicion_2 IS NULL
    OR trim(m.condicion_2) = ''
    OR m.condicion_2 ~* '^\d+\s*(?:–|-|a|\.\.\.)\s*\d+\s*MWh'
  );

CREATE OR REPLACE FUNCTION public.backfill_tariff_prices_from_marco(
  p_tariff_id uuid,
  p_marco public.marco_retributivo
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_period text;
  v_energy numeric;
  v_power numeric;
  v_any boolean := false;
BEGIN
  FOR v_period, v_energy, v_power IN
    SELECT * FROM (
      VALUES
        ('P1', p_marco.energia_p1, p_marco.potencia_p1),
        ('P2', p_marco.energia_p2, p_marco.potencia_p2),
        ('P3', p_marco.energia_p3, p_marco.potencia_p3),
        ('P4', p_marco.energia_p4, p_marco.potencia_p4),
        ('P5', p_marco.energia_p5, p_marco.potencia_p5),
        ('P6', p_marco.energia_p6, p_marco.potencia_p6)
    ) AS t(period, energy, power)
  LOOP
    IF COALESCE(v_energy, 0) <> 0 OR COALESCE(v_power, 0) <> 0 THEN
      v_any := true;
      INSERT INTO public.tariff_prices (tariff_id, period, energy_price_kwh, power_price_kw_day)
      VALUES (
        p_tariff_id,
        v_period,
        COALESCE(v_energy, 0),
        COALESCE(v_power, 0)
      )
      ON CONFLICT (tariff_id, period) DO UPDATE
      SET
        energy_price_kwh = EXCLUDED.energy_price_kwh,
        power_price_kw_day = EXCLUDED.power_price_kw_day;
    END IF;
  END LOOP;

  IF NOT v_any THEN
    INSERT INTO public.tariff_prices (tariff_id, period, energy_price_kwh, power_price_kw_day)
    VALUES (p_tariff_id, 'P1', 0.000001, 0.000001)
    ON CONFLICT (tariff_id, period) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_tariffs_from_marco_unlinked()
RETURNS TABLE (
  providers_created integer,
  tariffs_created integer,
  marco_linked integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_provider_id uuid;
  v_tariff_id uuid;
  v_providers_created integer := 0;
  v_tariffs_created integer := 0;
  v_marco_linked integer := 0;
  v_provider_name text;
  v_provider_created boolean;
  v_linked_batch integer;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (
      public.marco_compania_to_provider_name(m.compania),
      trim(m.tarifa),
      trim(m.peaje),
      m.segmento,
      m.tipo
    )
      m.*
    FROM public.marco_retributivo m
    WHERE m.activo = true
      AND m.tariff_id IS NULL
    ORDER BY
      public.marco_compania_to_provider_name(m.compania),
      trim(m.tarifa),
      trim(m.peaje),
      m.segmento,
      m.tipo,
      m.id ASC
  LOOP
    v_provider_name := public.marco_compania_to_provider_name(r.compania);
    SELECT ep.provider_id, ep.created
    INTO v_provider_id, v_provider_created
    FROM public.ensure_provider_id(v_provider_name) AS ep;
    IF v_provider_id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_provider_created THEN
      v_providers_created := v_providers_created + 1;
    END IF;

    SELECT t.id INTO v_tariff_id
    FROM public.tariffs t
    WHERE t.provider_id = v_provider_id
      AND trim(t.name) = trim(r.tarifa)
      AND trim(t.access_tariff) = trim(r.peaje)
      AND COALESCE(t.segment, 'residencial') = r.segmento
      AND t.supply_type = r.tipo
      AND t.is_active IS NOT FALSE
    ORDER BY t.id
    LIMIT 1;

    IF v_tariff_id IS NULL THEN
      INSERT INTO public.tariffs (
        provider_id,
        name,
        supply_type,
        access_tariff,
        segment,
        is_active,
        erp_active,
        web_visible,
        is_indexed
      )
      VALUES (
        v_provider_id,
        trim(r.tarifa),
        r.tipo,
        trim(r.peaje),
        r.segmento,
        true,
        true,
        false,
        COALESCE(r.tipo_precio = 'indexado', false)
      )
      RETURNING id INTO v_tariff_id;

      v_tariffs_created := v_tariffs_created + 1;
      PERFORM public.backfill_tariff_prices_from_marco(
        v_tariff_id,
        (SELECT mr FROM public.marco_retributivo mr WHERE mr.id = r.id)
      );
    END IF;

    UPDATE public.marco_retributivo m
    SET
      tariff_id = v_tariff_id,
      source = COALESCE(NULLIF(m.source, ''), 'manual'),
      updated_at = now()
    WHERE m.activo = true
      AND m.tariff_id IS NULL
      AND public.marco_compania_to_provider_name(m.compania) = v_provider_name
      AND trim(m.tarifa) = trim(r.tarifa)
      AND trim(m.peaje) = trim(r.peaje)
      AND m.segmento = r.segmento
      AND m.tipo = r.tipo;

    GET DIAGNOSTICS v_linked_batch = ROW_COUNT;
    v_marco_linked := v_marco_linked + v_linked_batch;
  END LOOP;

  providers_created := v_providers_created;
  tariffs_created := v_tariffs_created;
  marco_linked := v_marco_linked;
  RETURN NEXT;
END;
$$;

SELECT * FROM public.backfill_tariffs_from_marco_unlinked();
