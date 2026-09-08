-- Precios P/E de la tarifa AT por contrato (GET /v1/tariffs/{id})

alter table public.contratos_equipo
  add column if not exists at_prices jsonb not null default '[]'::jsonb;

comment on column public.contratos_equipo.at_prices is
  'Precios potencia/energia por periodo desde GET /v1/tariffs/{id}. Sync incremental o al abrir el drawer.';
