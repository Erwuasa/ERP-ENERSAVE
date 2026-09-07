-- Correcciones confirmadas: Endesa (pyme), Repsol residencial, Niba

begin;

-- 1. ENDESA: residencial flat 6 meses + pyme con tabla real de 3 tramos
delete from public.retrocomision_schedules where compania = 'Endesa';

insert into public.retrocomision_schedules (compania, segmento, tipo_calculo, meses_flat, notas) values
  ('Endesa', 'residencial', 'meses_flat', 6, null);

insert into public.retrocomision_schedules (compania, segmento, tipo_calculo, tramos) values
  ('Endesa', 'pyme', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 6, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 6, "hasta_mes": 9, "valor": 60, "unidad": "porcentaje"},
    {"desde_mes": 9, "hasta_mes": 12, "valor": 30, "unidad": "porcentaje"}
  ]'::jsonb);

-- 2. REPSOL RESIDENCIAL: 100% fijo sin caducidad
delete from public.retrocomision_schedules where compania = 'Repsol' and segmento = 'residencial';

insert into public.retrocomision_schedules (compania, segmento, tipo_calculo, tramos, notas) values
  ('Repsol', 'residencial', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 9999, "valor": 100, "unidad": "porcentaje"}
  ]'::jsonb, 'Confirmado: retrocomision fija al 100% sin caducidad para residencial, a diferencia de PYME que si decae');

-- 3. NIBA: curva real (identica a Gana Energia)
delete from public.retrocomision_schedules where compania = 'Niba';

insert into public.retrocomision_schedules (compania, segmento, tipo_calculo, tramos, notas) values
  ('Niba', 'ambos', 'tramos_porcentaje', '[
    {"desde_mes": 0, "hasta_mes": 3, "valor": 100, "unidad": "porcentaje"},
    {"desde_mes": 3, "hasta_mes": 6, "valor": 75, "unidad": "porcentaje"},
    {"desde_mes": 6, "hasta_mes": 9, "valor": 50, "unidad": "porcentaje"},
    {"desde_mes": 9, "hasta_mes": 12, "valor": 25, "unidad": "porcentaje"}
  ]'::jsonb, 'Confirmado por el usuario: misma curva que Gana Energia, ya no es provisional');

commit;
