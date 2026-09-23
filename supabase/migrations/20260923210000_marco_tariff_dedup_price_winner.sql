-- Deduplicación por nombre (normalizado): conserva mayor suma energía+potencia y mayor comisión.
-- Desactiva el resto de filas activas en el mismo grupo comercial.

WITH scored AS (
  SELECT
    id,
    compania,
    peaje,
    segmento,
    tipo,
    comision_base,
    comision_unidad,
    comision_tipo,
    COALESCE(condicion_2, '') AS cond2,
    lower(
      regexp_replace(
        regexp_replace(
          translate(trim(tarifa), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'),
          '\s*[+\+]\s*',
          ' con ',
          'gi'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS tarifa_norm,
    (
      COALESCE(energia_p1, 0) + COALESCE(energia_p2, 0) + COALESCE(energia_p3, 0)
      + COALESCE(energia_p4, 0) + COALESCE(energia_p5, 0) + COALESCE(energia_p6, 0)
      + COALESCE(potencia_p1, 0) + COALESCE(potencia_p2, 0) + COALESCE(potencia_p3, 0)
      + COALESCE(potencia_p4, 0) + COALESCE(potencia_p5, 0) + COALESCE(potencia_p6, 0)
    ) AS price_score,
    row_number() OVER (
      PARTITION BY
        compania,
        peaje,
        segmento,
        tipo,
        comision_base,
        comision_unidad,
        comision_tipo,
        COALESCE(condicion_2, ''),
        lower(
          regexp_replace(
            regexp_replace(
              translate(trim(tarifa), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'),
              '\s*[+\+]\s*',
              ' con ',
              'gi'
            ),
            '\s+',
            ' ',
            'g'
          )
        )
      ORDER BY
        (
          COALESCE(energia_p1, 0) + COALESCE(energia_p2, 0) + COALESCE(energia_p3, 0)
          + COALESCE(energia_p4, 0) + COALESCE(energia_p5, 0) + COALESCE(energia_p6, 0)
          + COALESCE(potencia_p1, 0) + COALESCE(potencia_p2, 0) + COALESCE(potencia_p3, 0)
          + COALESCE(potencia_p4, 0) + COALESCE(potencia_p5, 0) + COALESCE(potencia_p6, 0)
        ) DESC,
        comision_base DESC,
        length(tarifa) DESC,
        created_at ASC NULLS LAST,
        id ASC
    ) AS rn
  FROM marco_retributivo
  WHERE activo = true
),
losers AS (
  SELECT id FROM scored WHERE rn > 1
)
UPDATE marco_retributivo m
SET
  activo = false,
  updated_at = now(),
  condiciones = COALESCE(m.condiciones, '') || ' [DESACTIVADO dedup precio 2026-09-23]'
WHERE m.id IN (SELECT id FROM losers);

-- Tarifas ERP: mismo nombre normalizado + compañía + segmento + peaje → conservar mayor precio.
WITH tariff_scored AS (
  SELECT
    t.id,
    lower(regexp_replace(translate(trim(p.name), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'), '\s+', ' ', 'g')) AS company_norm,
    lower(regexp_replace(translate(trim(t.name), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'), '\s+', ' ', 'g')) AS name_norm,
    t.segment,
    t.access_tariff,
    t.supply_type,
    COALESCE(
      (
        SELECT SUM(COALESCE(tp.energy_price_kwh, 0) + COALESCE(tp.power_price_kw_day, 0))
        FROM tariff_prices tp
        WHERE tp.tariff_id = t.id
      ),
      0
    ) AS price_score,
    row_number() OVER (
      PARTITION BY
        lower(regexp_replace(translate(trim(p.name), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'), '\s+', ' ', 'g')),
        lower(regexp_replace(translate(trim(t.name), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'), '\s+', ' ', 'g')),
        t.segment,
        t.access_tariff,
        t.supply_type
      ORDER BY
        COALESCE(
          (
            SELECT SUM(COALESCE(tp.energy_price_kwh, 0) + COALESCE(tp.power_price_kw_day, 0))
            FROM tariff_prices tp
            WHERE tp.tariff_id = t.id
          ),
          0
        ) DESC,
        t.name ASC,
        t.id ASC
    ) AS rn
  FROM tariffs t
  LEFT JOIN providers p ON p.id = t.provider_id
  WHERE t.is_active = true
    AND t.erp_active = true
),
tariff_losers AS (
  SELECT id FROM tariff_scored WHERE rn > 1
)
UPDATE tariffs t
SET erp_active = false
WHERE t.id IN (SELECT id FROM tariff_losers);
