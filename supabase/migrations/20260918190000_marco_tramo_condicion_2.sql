-- Mueve tramos MWh de condicion_1 a condicion_2 y deja Camp en condicion_1.
UPDATE marco_retributivo
SET
  condicion_1 = CASE
    WHEN condicion_2 ~* '^Camp:' THEN condicion_2
    ELSE NULL
  END,
  condicion_2 = regexp_replace(
    regexp_replace(trim(condicion_1), '^Tramo:\s*', '', 'i'),
    '–',
    '-',
    'g'
  )
WHERE activo = true
  AND condicion_1 ~* '^Tramo:';

-- Camp suelto en condicion_2 pasa a condicion_1.
UPDATE marco_retributivo
SET
  condicion_1 = condicion_2,
  condicion_2 = NULL
WHERE activo = true
  AND condicion_2 ~* '^Camp:'
  AND condicion_2 !~* 'MWh'
  AND condicion_2 !~* 'kWh';
