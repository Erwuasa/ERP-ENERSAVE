-- Diagnóstico: settlements AT sin contrato_id vinculado
-- Ejecutar solo este archivo en Supabase SQL Editor (solo lectura).

select
  s.id as settlement_id,
  s.at_liquidation_id,
  s.descripcion,
  s.estado,
  s.monto_interno,
  s.monto_externo,
  s.created_at,
  coalesce(
    s.at_payload->>'contract_id',
    s.at_payload->>'contrato_id',
    s.at_payload->'contract'->>'id',
    s.at_payload->'contrato'->>'id',
    s.at_payload->>'contracts_id'
  ) as at_contract_id_en_payload,
  coalesce(
    s.at_payload->>'cups',
    s.at_payload->'electricity_data'->>'cups',
    s.at_payload->'electricity_data'->>'CUPS',
    s.at_payload->'gas_data'->>'cups',
    s.at_payload->'gas_data'->>'CUPS'
  ) as cups_en_payload,
  s.at_payload->>'client_name' as client_name_payload,
  s.at_payload->>'business_name' as business_name_payload,
  case
    when coalesce(
      s.at_payload->>'contract_id',
      s.at_payload->>'contrato_id',
      s.at_payload->'contract'->>'id',
      s.at_payload->'contrato'->>'id'
    ) is null then 'sin contract_id en payload'
    when not exists (
      select 1
      from public.contratos_equipo ce
      where ce.at_contract_id::text = coalesce(
        s.at_payload->>'contract_id',
        s.at_payload->>'contrato_id',
        s.at_payload->'contract'->>'id',
        s.at_payload->'contrato'->>'id',
        s.at_payload->>'contracts_id'
      )
    ) then 'contract_id en payload pero contrato no sincronizado en ERP'
    else 'revisar manualmente'
  end as motivo_probable
from public.settlements s
where s.source = 'at'
  and s.contrato_id is null
order by s.created_at desc;

-- ¿Existe match por CUPS en contratos_equipo?
select
  s.id as settlement_id,
  s.descripcion,
  orphan_cups.cups,
  ce.id as contrato_erp_id,
  ce.client_name,
  ce.compania,
  ce.at_contract_id
from public.settlements s
cross join lateral (
  select coalesce(
    nullif(trim(s.at_payload->>'cups'), ''),
    nullif(trim(s.at_payload->'electricity_data'->>'cups'), ''),
    nullif(trim(s.at_payload->'electricity_data'->>'CUPS'), ''),
    nullif(trim(s.at_payload->'gas_data'->>'cups'), ''),
    nullif(trim(s.at_payload->'gas_data'->>'CUPS'), '')
  ) as cups
) orphan_cups
left join public.contratos_equipo ce
  on ce.source = 'at'
 and upper(trim(ce.cups)) = upper(trim(orphan_cups.cups))
where s.source = 'at'
  and s.contrato_id is null
  and orphan_cups.cups is not null
order by s.id, ce.client_name;
