-- Segmentos del marco: residencial | pyme | autonomo | comunidades (sin "ambos")
-- Requiere: 20260722000001_marco_retributivo_table.sql

begin;

do $$
begin
  if to_regclass('public.marco_retributivo') is null then
    raise exception 'Falta public.marco_retributivo. Ejecuta primero 20260722000001_marco_retributivo_table.sql';
  end if;
end $$;

alter table public.marco_retributivo drop constraint if exists marco_retributivo_segmento_check;

update public.marco_retributivo
set segmento = case
  when lower(coalesce(condiciones, '') || ' ' || coalesce(condicion_1, '') || ' ' || coalesce(condicion_2, '')) like '%comunidad%'
    or lower(coalesce(condiciones, '')) like '%vecinos%' then 'comunidades'
  when lower(coalesce(condiciones, '')) like '%autónom%'
    or lower(coalesce(condiciones, '')) like '%autonom%' then 'autonomo'
  when lower(coalesce(condiciones, '')) like '%pyme%'
    or lower(coalesce(condiciones, '')) like '%industrial%'
    or lower(coalesce(condiciones, '')) like '%negocio%' then 'pyme'
  when segmento = 'ambos' then 'residencial'
  else segmento
end
where segmento = 'ambos'
   or segmento not in ('residencial', 'pyme', 'autonomo', 'comunidades');

alter table public.marco_retributivo
  add constraint marco_retributivo_segmento_check
  check (segmento in ('residencial', 'pyme', 'autonomo', 'comunidades'));

alter table public.marco_retributivo alter column segmento set default 'residencial';

commit;
