-- Inferencia residencial / pyme por nombre (tarifas + marco), activar ERP con precios y rescatar Repsol.

CREATE OR REPLACE FUNCTION public.infer_marco_segmento_from_text(
  p_tarifa text,
  p_extra text DEFAULT ''
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN combined ~* '\m(comunidad|vecinos)\M' THEN 'comunidades'
    WHEN combined ~* 'aut[oó]nom' THEN 'autonomo'
    WHEN combined ~* '\m(pymes?|negocios?|empresa|empresas|business|industrial|comercio|oficina)\M' THEN 'pyme'
    WHEN combined ~* '\m(hogar|residencial|residencia|particular|domestic|doméstic|2ª?\s*residencia)\M'
      OR combined ~* '(_res_|\sres\s|\sres<|\mres\M)' THEN 'residencial'
    ELSE NULL
  END
  FROM (
    SELECT lower(trim(coalesce(p_tarifa, '') || ' ' || coalesce(p_extra, ''))) AS combined
  ) s;
$$;

CREATE OR REPLACE FUNCTION public.infer_tariff_segment_from_text(
  p_name text,
  p_access_tariff text DEFAULT ''
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    public.infer_marco_segmento_from_text(p_name, ''),
    CASE
      WHEN lower(replace(coalesce(p_access_tariff, ''), ' ', '')) LIKE '%2.0%' THEN 'residencial'
      WHEN lower(replace(coalesce(p_access_tariff, ''), ' ', '')) LIKE '%3.0%'
        OR lower(replace(coalesce(p_access_tariff, ''), ' ', '')) LIKE '%6.1%'
        OR lower(replace(coalesce(p_access_tariff, ''), ' ', '')) LIKE '%6.2%' THEN 'pyme'
      ELSE NULL
    END
  );
$$;

-- Tarifas luz activas
UPDATE public.tariffs t
SET segment = inferred.new_segment
FROM (
  SELECT
    id,
    public.infer_tariff_segment_from_text(name, access_tariff) AS new_segment
  FROM public.tariffs
  WHERE is_active IS TRUE
    AND supply_type = 'luz'
) inferred
WHERE t.id = inferred.id
  AND inferred.new_segment IN ('residencial', 'pyme')
  AND t.segment IS DISTINCT FROM inferred.new_segment;

-- Marco activo (incluye comisión 0)
UPDATE public.marco_retributivo m
SET
  segmento = inferred.new_segment,
  updated_at = now()
FROM (
  SELECT
    id,
    public.infer_marco_segmento_from_text(
      tarifa,
      trim(concat_ws(' ', condiciones, condicion_1, condicion_2))
    ) AS new_segment
  FROM public.marco_retributivo
  WHERE activo IS TRUE
) inferred
WHERE m.id = inferred.id
  AND inferred.new_segment IS NOT NULL
  AND m.segmento IS DISTINCT FROM inferred.new_segment;

-- Repsol: reactivar filas desactivadas sin duplicado activo equivalente
UPDATE public.marco_retributivo m
SET activo = true, updated_at = now()
WHERE m.activo IS NOT TRUE
  AND lower(trim(m.compania)) LIKE '%repsol%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.marco_retributivo a
    WHERE a.activo IS TRUE
      AND lower(trim(a.compania)) = lower(trim(m.compania))
      AND trim(a.tarifa) = trim(m.tarifa)
      AND trim(a.peaje) = trim(m.peaje)
      AND a.segmento = m.segmento
      AND a.tipo = m.tipo
  );

-- ERP comparador / tarifas: activar tarifas con precios o marco vinculado
UPDATE public.tariffs t
SET erp_active = true
WHERE t.is_active IS TRUE
  AND t.supply_type = 'luz'
  AND COALESCE(t.erp_active, false) IS NOT TRUE
  AND (
    EXISTS (SELECT 1 FROM public.tariff_prices tp WHERE tp.tariff_id = t.id)
    OR EXISTS (
      SELECT 1 FROM public.marco_retributivo mr
      WHERE mr.tariff_id = t.id AND mr.activo IS TRUE
    )
  );

-- Sincronizar precios marco → tariff_prices cuando falten periodos
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT m.*
    FROM public.marco_retributivo m
    WHERE m.activo IS TRUE
      AND m.tariff_id IS NOT NULL
  LOOP
    PERFORM public.backfill_tariff_prices_from_marco(
      r.tariff_id,
      (SELECT mr FROM public.marco_retributivo mr WHERE mr.id = r.id)
    );
  END LOOP;
END;
$$;

-- Si devuelve 0/0/0: no quedan filas activas de marco sin tariff_id (estado correcto tras una ejecución previa).
SELECT * FROM public.backfill_tariffs_from_marco_unlinked();
