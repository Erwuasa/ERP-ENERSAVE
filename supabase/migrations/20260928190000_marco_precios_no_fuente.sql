-- Los precios de energía y potencia viven en tariff_prices.
-- Las columnas del marco dejan de ser fuente de precio.

update public.marco_retributivo
set
  energia_p1 = null,
  energia_p2 = null,
  energia_p3 = null,
  energia_p4 = null,
  energia_p5 = null,
  energia_p6 = null,
  potencia_p1 = null,
  potencia_p2 = null,
  potencia_p3 = null,
  potencia_p4 = null,
  potencia_p5 = null,
  potencia_p6 = null
where
  energia_p1 is not null
  or energia_p2 is not null
  or energia_p3 is not null
  or energia_p4 is not null
  or energia_p5 is not null
  or energia_p6 is not null
  or potencia_p1 is not null
  or potencia_p2 is not null
  or potencia_p3 is not null
  or potencia_p4 is not null
  or potencia_p5 is not null
  or potencia_p6 is not null;

comment on column public.marco_retributivo.energia_p1 is
  'Obsoleto. El precio de energía está en tariff_prices.';
comment on column public.marco_retributivo.potencia_p1 is
  'Obsoleto. El precio de potencia está en tariff_prices.';
