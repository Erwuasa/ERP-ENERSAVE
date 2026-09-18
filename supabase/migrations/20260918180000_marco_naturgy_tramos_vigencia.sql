-- Naturgy PYME: desactivar filas legacy duplicadas
UPDATE marco_retributivo
SET activo = false, updated_at = now()
WHERE compania = 'Naturgy'
  AND activo = true
  AND condiciones ILIKE '%DESACTIVADO%';

-- Naturgy BASE / ONE / SUPRA: tramos consumo + permanencia
UPDATE marco_retributivo
SET
  tramos = '[
    {"desde_kwh":0,"hasta_kwh":9999,"comision_base":96,"condicion":"General (<10 MWh)","unidad":"eur_cups"},
    {"desde_kwh":10000,"hasta_kwh":999999999,"comision_base":11.20,"condicion":"10-∞ MWh","unidad":"eur_mwh"}
  ]'::jsonb,
  vigencia_meses = 12,
  condicion_2 = 'Adicional: 11,20 €/MWh a partir de 10 MWh',
  updated_at = now()
WHERE compania = 'Naturgy' AND tarifa = 'BASE' AND segmento = 'pyme';

UPDATE marco_retributivo
SET
  tramos = '[
    {"desde_kwh":0,"hasta_kwh":9999,"comision_base":48,"condicion":"General (<10 MWh)","unidad":"eur_cups"},
    {"desde_kwh":10000,"hasta_kwh":999999999,"comision_base":4.80,"condicion":"10-∞ MWh","unidad":"eur_mwh"}
  ]'::jsonb,
  vigencia_meses = 12,
  condicion_2 = 'Adicional: 4,80 €/MWh a partir de 10 MWh',
  updated_at = now()
WHERE compania = 'Naturgy' AND tarifa = 'ONE' AND segmento = 'pyme';

UPDATE marco_retributivo
SET
  tramos = '[
    {"desde_kwh":0,"hasta_kwh":9999,"comision_base":144,"condicion":"General (<10 MWh)","unidad":"eur_cups"},
    {"desde_kwh":10000,"hasta_kwh":999999999,"comision_base":21.60,"condicion":"10-∞ MWh","unidad":"eur_mwh"}
  ]'::jsonb,
  vigencia_meses = 12,
  condicion_2 = 'Adicional: 21,60 €/MWh a partir de 10 MWh',
  updated_at = now()
WHERE compania = 'Naturgy' AND tarifa = 'SUPRA' AND segmento = 'pyme';

-- Naturgy residencial: 4 meses retro
UPDATE marco_retributivo
SET vigencia_meses = 4, updated_at = now()
WHERE compania = 'Naturgy' AND segmento = 'residencial' AND activo = true;

-- Retro residencial por compañía
UPDATE marco_retributivo SET vigencia_meses = 6, updated_at = now()
WHERE activo = true AND compania IN ('Endesa', 'Octopus Energy', 'Repsol') AND vigencia_meses = 0;

UPDATE marco_retributivo SET vigencia_meses = 12, updated_at = now()
WHERE activo = true AND compania IN ('Gana Energia', 'Niba', 'Nordy') AND vigencia_meses = 0;

-- Gana Energía: tramos consumo anual residencial
UPDATE marco_retributivo
SET
  tramos = '[
    {"desde_kwh":0,"hasta_kwh":5000,"comision_base":104,"condicion":"0-5.000 kWh","unidad":"eur_cups"},
    {"desde_kwh":5001,"hasta_kwh":10000,"comision_base":120,"condicion":"5.001-10.000 kWh","unidad":"eur_cups"},
    {"desde_kwh":10001,"hasta_kwh":30000,"comision_base":136,"condicion":"10.001-30.000 kWh","unidad":"eur_cups"},
    {"desde_kwh":30001,"hasta_kwh":999999999,"comision_base":184,"condicion":">30.000 kWh","unidad":"eur_cups"}
  ]'::jsonb,
  condicion_2 = 'Tramos por consumo anual (activación)',
  updated_at = now()
WHERE compania = 'Gana Energia' AND tarifa ILIKE '%referencia%';

-- Endesa: ampliar marco con tramos potencia/consumo de referencia
UPDATE marco_retributivo
SET
  tramos = '[
    {"desde_kwh":0,"hasta_kwh":999999999,"comision_base":97.20,"condicion":"2.0TD ≤10 kW (zona ENDESA)","unidad":"eur_cups"}
  ]'::jsonb,
  condicion_2 = '2.0TD 10-15 kW: 109,60€ · 3.0TD: 109,60€ · Gas VC: 61,60€',
  updated_at = now()
WHERE compania = 'Endesa' AND tarifa ILIKE '%referencia%';

-- Endesa: filas adicionales para tarifas frecuentes del catálogo
INSERT INTO marco_retributivo (
  compania, tarifa, tipo, peaje, segmento,
  condicion_1, condicion_2, condiciones,
  comision_tipo, comision_base, comision_unidad,
  vigencia_meses, fecha_inicio, activo, source
)
SELECT
  'Endesa',
  tariff_rows.tariff_name,
  'luz',
  COALESCE(tariff_rows.access_tariff, '2.0TD'),
  'residencial',
  'Tramo: General',
  '2.0TD ≤10 kW: 97,20€',
  'Marco derivado de comisión de referencia Endesa. Retro: 6 meses.',
  'fija',
  97.20,
  'eur_cups',
  6,
  CURRENT_DATE,
  true,
  'manual'
FROM (
  SELECT DISTINCT ON (t.name, t.access_tariff) t.name AS tariff_name, t.access_tariff
  FROM tariffs t
  JOIN providers p ON p.id = t.provider_id
  WHERE t.erp_active AND p.name ILIKE '%endesa%'
  ORDER BY t.name, t.access_tariff, t.id
) tariff_rows
WHERE NOT EXISTS (
  SELECT 1 FROM marco_retributivo m
  WHERE m.activo = true
    AND m.compania = 'Endesa'
    AND m.tarifa = tariff_rows.tariff_name
    AND m.peaje = COALESCE(tariff_rows.access_tariff, '2.0TD')
);
