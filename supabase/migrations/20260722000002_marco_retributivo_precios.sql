-- Precios por periodo en marco retributivo (catálogo Productos)
-- Requiere: 20260722000001_marco_retributivo_table.sql

begin;

do $$
begin
  if to_regclass('public.marco_retributivo') is null then
    raise exception 'Falta public.marco_retributivo. Ejecuta primero 20260722000001_marco_retributivo_table.sql';
  end if;
end $$;

alter table public.marco_retributivo
  add column if not exists energia_p1 numeric(10, 6),
  add column if not exists energia_p2 numeric(10, 6),
  add column if not exists energia_p3 numeric(10, 6),
  add column if not exists energia_p4 numeric(10, 6),
  add column if not exists energia_p5 numeric(10, 6),
  add column if not exists energia_p6 numeric(10, 6),
  add column if not exists potencia_p1 numeric(10, 6),
  add column if not exists potencia_p2 numeric(10, 6),
  add column if not exists potencia_p3 numeric(10, 6),
  add column if not exists potencia_p4 numeric(10, 6),
  add column if not exists potencia_p5 numeric(10, 6),
  add column if not exists potencia_p6 numeric(10, 6);

comment on column public.marco_retributivo.energia_p1 is 'Precio energía P1 €/kWh';
comment on column public.marco_retributivo.potencia_p1 is 'Precio potencia P1 €/kW·día';

update public.marco_retributivo
set
  energia_p1 = 0.118,
  energia_p2 = 0.105,
  energia_p3 = 0.088,
  potencia_p1 = 0.045,
  potencia_p2 = 0.038
where peaje like '2.0TD%' and tipo = 'luz' and energia_p1 is null;

update public.marco_retributivo
set
  energia_p1 = 0.112,
  energia_p2 = 0.098,
  energia_p3 = 0.091,
  energia_p4 = 0.085,
  energia_p5 = 0.079,
  energia_p6 = 0.074,
  potencia_p1 = 0.062,
  potencia_p2 = 0.055,
  potencia_p3 = 0.048
where peaje like '3.0TD%' and tipo = 'luz' and energia_p1 is null;

update public.marco_retributivo
set
  energia_p1 = 0.095,
  energia_p2 = 0.088,
  energia_p3 = 0.082,
  potencia_p1 = 0.041,
  potencia_p2 = 0.036
where tipo = 'gas' and energia_p1 is null;

commit;
