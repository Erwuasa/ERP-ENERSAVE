-- Tipo de evento en liquidaciones + unicidad activación por contrato

begin;

alter table public.settlements
  add column if not exists tipo_evento text
  check (
    tipo_evento is null
    or tipo_evento in ('activacion', 'retrocomision', 'mensual', 'ajuste')
  );

comment on column public.settlements.tipo_evento is
  'Origen de la liquidación: activacion al confirmar contrato, retrocomision, mensual, ajuste manual.';

create unique index if not exists idx_settlements_contrato_tipo_evento_activacion
  on public.settlements (contrato_id, tipo_evento)
  where contrato_id is not null and tipo_evento = 'activacion';

commit;
