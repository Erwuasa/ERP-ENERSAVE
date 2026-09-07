-- Fecha de baja en liquidaciones de retrocomisión

begin;

alter table public.settlements
  add column if not exists fecha_baja timestamptz;

comment on column public.settlements.fecha_baja is
  'Fecha oficial de baja del suministro asociada a una liquidación de retrocomisión.';

create unique index if not exists idx_settlements_contrato_tipo_evento_retrocomision
  on public.settlements (contrato_id, tipo_evento)
  where contrato_id is not null and tipo_evento = 'retrocomision';

-- El comercial puede recibir liquidaciones de retrocomisión generadas al dar de baja un contrato.
drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or (
      comercial_id in (select private.accessible_comercial_ids())
      and estado = 'pendiente'
      and (
        es_retrocomision = false
        or tipo_evento = 'retrocomision'
      )
    )
  );

commit;
