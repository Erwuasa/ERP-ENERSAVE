UPDATE marco_retributivo
SET
  peaje = 'Todas',
  tarifa = 'Gana Energía - Activación',
  condicion_1 = 'Activación por consumo anual',
  tramos = '[
    {"desde_kwh":0,"hasta_kwh":5000,"comision_base":104,"condicion":"0-5 MWh","unidad":"eur_cups"},
    {"desde_kwh":5001,"hasta_kwh":10000,"comision_base":120,"condicion":"5-10 MWh","unidad":"eur_cups"},
    {"desde_kwh":10001,"hasta_kwh":30000,"comision_base":136,"condicion":"10-30 MWh","unidad":"eur_cups"},
    {"desde_kwh":30001,"hasta_kwh":999999999,"comision_base":184,"condicion":"30-∞ MWh","unidad":"eur_cups"}
  ]'::jsonb,
  updated_at = now()
WHERE compania = 'Gana Energia' AND tarifa ILIKE '%referencia%';
