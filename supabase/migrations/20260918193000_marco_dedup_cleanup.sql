-- Desactiva duplicados del marco retributivo:
-- 1) Mismo nombre normalizado (+/con, mayúsculas) + misma comisión/condición
-- 2) Prefijo FIJA (ej. AIRE vs FIJA AIRE) + misma comisión/condición
-- 3) Prefijo FACIL … ENERGY (+) + misma comisión/condición
-- 4) Filas "Comisión de referencia" sin datos reales (condicion_2 vacía/no identificados)

WITH exact_norm_dupes AS (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY
          compania,
          peaje,
          segmento,
          tipo,
          comision_base,
          comision_unidad,
          comision_tipo,
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
          ),
          COALESCE(condicion_2, '')
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM marco_retributivo
    WHERE activo = true
  ) ranked
  WHERE rn > 1
),
prefix_fija_dupes AS (
  SELECT b.id
  FROM marco_retributivo a
  JOIN marco_retributivo b
    ON a.compania = b.compania
   AND a.peaje = b.peaje
   AND a.segmento = b.segmento
   AND a.tipo = b.tipo
   AND a.comision_base = b.comision_base
   AND a.comision_unidad = b.comision_unidad
   AND COALESCE(a.condicion_2, '') = COALESCE(b.condicion_2, '')
   AND a.activo = true
   AND b.activo = true
   AND upper(trim(a.tarifa)) = 'FIJA ' || upper(trim(b.tarifa))
   AND length(trim(b.tarifa)) >= 3
),
facil_energy_dupes AS (
  SELECT b.id
  FROM marco_retributivo a
  JOIN marco_retributivo b
    ON a.compania = b.compania
   AND a.peaje = b.peaje
   AND a.segmento = b.segmento
   AND a.tipo = b.tipo
   AND a.comision_base = b.comision_base
   AND a.comision_unidad = b.comision_unidad
   AND COALESCE(a.condicion_2, '') = COALESCE(b.condicion_2, '')
   AND a.activo = true
   AND b.activo = true
   AND (
     upper(trim(a.tarifa)) = 'FACIL ' || upper(trim(b.tarifa)) || ' ENERGY'
     OR upper(trim(a.tarifa)) = 'FACIL ' || upper(trim(b.tarifa)) || ' ENERGY+'
   )
),
referencia_placeholder AS (
  SELECT id
  FROM marco_retributivo
  WHERE activo = true
    AND tarifa ~* 'comisi[oó]n de referencia'
    AND (
      condicion_2 IS NULL
      OR trim(condicion_2) = ''
      OR condicion_2 ILIKE 'no identificad%'
    )
),
to_deactivate AS (
  SELECT id FROM exact_norm_dupes
  UNION
  SELECT id FROM prefix_fija_dupes
  UNION
  SELECT id FROM facil_energy_dupes
  UNION
  SELECT id FROM referencia_placeholder
)
UPDATE marco_retributivo m
SET
  activo = false,
  updated_at = now(),
  condiciones = COALESCE(m.condiciones, '') || ' [DESACTIVADO dedup 2026-09-18]'
WHERE m.id IN (SELECT id FROM to_deactivate)
  AND m.activo = true;
