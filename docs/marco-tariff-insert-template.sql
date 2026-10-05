-- Orden definitivo: provider → tariff → tariff_prices (reales) → marco_retributivo (con tariff_id).
-- Columnas según public.* en Supabase. Checks marco: comision_tipo ('fija'|'porcentaje'),
-- comision_unidad ('eur_cups'|porcentaje_*), source ('manual'|'at'), segmento, tipo ('luz'|'gas').
--
-- IMPORTANTE — dónde ejecutar:
-- Proyecto ERP: ref unxrvwuaqhwogwvynoyq (mismo SUPABASE_URL del .env).
-- Si sale "relation public.providers does not exist", estás en OTRO Postgres (local vacío,
-- rama preview sin schema, u otro proyecto). Abre SQL Editor en ese proyecto o aplica migraciones.
--
-- Comprobación (debe devolver providers, tariffs, tariff_prices, marco_retributivo):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('providers','tariffs','tariff_prices','marco_retributivo')
-- ORDER BY 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- REGLA tariff_id
-- ─────────────────────────────────────────────────────────────────────────────
-- Paso 4: SIEMPRE tariff_id explícito (el del paso 2). No dejar NULL esperando
-- backfill_tariffs_from_marco_unlinked() salvo productos de precio fijo P1–P6
-- cargados en marco (energia_p1… / potencia_p1…) donde el backfill puede crear
-- tarifa + precios desde esas columnas.
-- El backfill con tramos JSON solo pone precio dummy (P1 0,000001) si no hay P1–P6.

-- Los textos <provider_id> y <tariff_id> NO son válidos en SQL: son marcadores.
-- Sustitúyelos por UUID reales (ej. a1b2c3d4-...) del RETURNING del paso anterior,
-- o ejecuta el bloque DO de abajo (recomendado en SQL Editor).

-- ═════════════════════════════════════════════════════════════════════════════
-- EJEMPLO EJECUTABLE (Plenitude / INDEX POWER) — copiar y ejecutar entero
-- ═════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_provider_id uuid;
  v_tariff_id uuid;
  v_tariff_name text := 'INDEX POWER';
  v_provider_label text := 'Plenitude';
BEGIN
  SELECT p.id INTO v_provider_id
  FROM public.providers p
  WHERE lower(trim(p.name)) = lower(v_provider_label)
  ORDER BY (p.is_active IS TRUE) DESC, p.name
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    INSERT INTO public.providers (name, is_active)
    VALUES (v_provider_label, true)
    RETURNING id INTO v_provider_id;
  END IF;

  SELECT t.id INTO v_tariff_id
  FROM public.tariffs t
  WHERE t.provider_id = v_provider_id
    AND trim(t.name) = v_tariff_name
    AND t.access_tariff = '2.0TD'
    AND t.segment = 'pyme'
    AND t.supply_type = 'luz'
    AND t.is_active IS NOT FALSE
  LIMIT 1;

  IF v_tariff_id IS NULL THEN
    INSERT INTO public.tariffs (
      provider_id, name, supply_type, access_tariff, segment,
      is_active, erp_active, web_visible, is_indexed
    )
    VALUES (
      v_provider_id, v_tariff_name, 'luz', '2.0TD', 'pyme',
      true, true, false, false
    )
    RETURNING id INTO v_tariff_id;
  END IF;

  INSERT INTO public.tariff_prices (tariff_id, period, energy_price_kwh, power_price_kw_day)
  VALUES
    (v_tariff_id, 'P1', 0.123456, 0.045678),
    (v_tariff_id, 'P2', 0.098765, 0.040000)
  ON CONFLICT (tariff_id, period) DO UPDATE
  SET
    energy_price_kwh = EXCLUDED.energy_price_kwh,
    power_price_kw_day = EXCLUDED.power_price_kw_day;

  INSERT INTO public.marco_retributivo (
    tariff_id, compania, tarifa, tipo, peaje, segmento,
    condicion_1, condicion_2, condiciones,
    comision_tipo, comision_base, comision_unidad,
    vigencia_meses, fecha_inicio, activo, source, tramos
  )
  VALUES (
    v_tariff_id,
    'Todo Plenitude (Digital Energy)',
    v_tariff_name,
    'luz', '2.0TD', 'pyme',
    'Camp: PERIODOS POWER ENERGY',
    '100-9999 MWh',
    'Fte: manual',
    'fija', 840, 'eur_cups',
    0, CURRENT_DATE, true, 'manual',
    '[
      {"desde_kwh":0,"hasta_kwh":5000,"comision_base":15.2,"unidad":"eur_cups","condicion":"0-5 MWh"},
      {"desde_kwh":5001,"hasta_kwh":9999000,"comision_base":840,"unidad":"eur_cups","condicion":"100-9999 MWh"}
    ]'::jsonb
  );

  RAISE NOTICE 'provider_id=%, tariff_id=%', v_provider_id, v_tariff_id;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Pasos sueltos (manual): tras paso 1, copia el UUID del RETURNING al paso 2, etc.
-- ═════════════════════════════════════════════════════════════════════════════
-- 1) INSERT provider … RETURNING id;
-- 2) INSERT tariffs … VALUES ('00000000-0000-0000-0000-000000000000'::uuid, …) RETURNING id;
-- 3) INSERT tariff_prices … VALUES ('…uuid tarifa…', 'P1', …);
-- 4) INSERT marco_retributivo … VALUES ('…uuid tarifa…', …);

-- Tramos legacy min_mwh/max_mwh/comision también parsean en UI; preferir desde_kwh/hasta_kwh/comision_base en altas nuevas.

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill masivo (solo rescate / precio fijo P1–P6 en filas marco)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT * FROM public.backfill_tariffs_from_marco_unlinked();
