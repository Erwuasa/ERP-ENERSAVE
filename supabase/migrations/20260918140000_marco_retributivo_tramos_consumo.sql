-- Tramos de comisión por consumo anual (detalle JSON, como retrocomision_schedules.tramos)
alter table public.marco_retributivo
  add column if not exists tramos jsonb not null default '[]'::jsonb;

comment on column public.marco_retributivo.tramos is
  'Tramos de comisión por consumo anual (kWh): [{desde_kwh,hasta_kwh,comision_base,condicion,unidad}]';
