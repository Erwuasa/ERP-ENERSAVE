-- Contratos AT referenciados por liquidaciones huérfanas pero ausentes en contratos_equipo
-- Ejecutar tras diagnose-settlements-sin-contrato.sql

select distinct
  coalesce(
    s.at_payload->>'contract_id',
    s.at_payload->>'contrato_id',
    s.at_payload->'contract'->>'id'
  ) as at_contract_id_faltante,
  count(*) as liquidaciones_huerfanas
from public.settlements s
where s.source = 'at'
  and s.contrato_id is null
group by 1
order by liquidaciones_huerfanas desc;

-- ¿Existen ya en contratos_equipo?
select
  missing.at_contract_id,
  ce.id as contrato_erp_id,
  ce.client_name,
  ce.compania
from (
  select distinct coalesce(
    s.at_payload->>'contract_id',
    s.at_payload->>'contrato_id',
    s.at_payload->'contract'->>'id'
  ) as at_contract_id
  from public.settlements s
  where s.source = 'at' and s.contrato_id is null
) missing
left join public.contratos_equipo ce
  on ce.at_contract_id::text = missing.at_contract_id;

-- Acción recomendada si contrato_erp_id es null para todos:
-- 1) Invocar Edge Function sync-contracts-at (modo full o incremental por ID)
-- 2) Volver a ejecutar sync-liquidations-at
-- 3) Re-ejecutar pasos 4 y 4b de fix-at-compania-placeholder.sql
