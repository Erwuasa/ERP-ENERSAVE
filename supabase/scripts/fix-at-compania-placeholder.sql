-- Corrección manual: contratos AT con compania placeholder o vacía
-- NO ejecutar sin revisar en staging / con backup.
-- Requiere: tablas contratos_equipo, providers, settlements.

begin;

-- ------------------------------------------------------------------
-- 1) Vista previa: contratos afectados
-- ------------------------------------------------------------------
select
  ce.id,
  ce.client_name,
  ce.compania as compania_actual,
  ce.tarifa as tarifa_actual,
  p.name as compania_desde_provider,
  ce.at_payload->>'provider_name' as provider_name_payload,
  ce.at_payload->>'compania' as compania_payload,
  ce.at_payload->>'company' as company_payload
from public.contratos_equipo ce
left join public.providers p
  on p.at_company_id::text = coalesce(
    ce.at_payload->>'provider_id',
    ce.at_payload->'contract'->>'provider_id'
  )
where ce.source = 'at'
  and (
    ce.compania is null
    or trim(ce.compania) = ''
    or upper(trim(ce.compania)) = 'AT'
    or ce.compania = 'Sin compañía'
  )
order by ce.updated_at desc;

-- ------------------------------------------------------------------
-- 2) Corregir compania en contratos_equipo
-- Prioridad: providers.name > campos del payload AT
-- ------------------------------------------------------------------
update public.contratos_equipo ce
set compania = coalesce(
  nullif(trim(p.name), ''),
  nullif(trim(ce.at_payload->>'provider_name'), ''),
  nullif(trim(ce.at_payload->>'compania_nombre'), ''),
  nullif(trim(ce.at_payload->>'proveedor_nombre'), ''),
  nullif(trim(ce.at_payload->>'billing_company_name'), ''),
  nullif(trim(ce.at_payload->>'company_name'), ''),
  nullif(trim(ce.at_payload->>'compania'), ''),
  nullif(trim(ce.at_payload->>'company'), ''),
  nullif(trim(ce.at_payload->'provider'->>'nombre'), ''),
  nullif(trim(ce.at_payload->'provider'->>'name'), '')
)
from public.providers p
where ce.source = 'at'
  and p.at_company_id::text = coalesce(
    ce.at_payload->>'provider_id',
    ce.at_payload->'contract'->>'provider_id',
    ce.at_payload->'provider'->>'id'
  )
  and (
    ce.compania is null
    or trim(ce.compania) = ''
    or upper(trim(ce.compania)) = 'AT'
    or ce.compania = 'Sin compañía'
  )
  and coalesce(
    nullif(trim(p.name), ''),
    nullif(trim(ce.at_payload->>'provider_name'), ''),
    nullif(trim(ce.at_payload->>'compania_nombre'), ''),
    nullif(trim(ce.at_payload->>'proveedor_nombre'), ''),
    nullif(trim(ce.at_payload->>'billing_company_name'), ''),
    nullif(trim(ce.at_payload->>'company_name'), ''),
    nullif(trim(ce.at_payload->>'compania'), ''),
    nullif(trim(ce.at_payload->>'company'), ''),
    nullif(trim(ce.at_payload->'provider'->>'nombre'), ''),
    nullif(trim(ce.at_payload->'provider'->>'name'), '')
  ) is not null
  and upper(coalesce(
    nullif(trim(p.name), ''),
    nullif(trim(ce.at_payload->>'provider_name'), ''),
    nullif(trim(ce.at_payload->>'compania'), ''),
    nullif(trim(ce.at_payload->>'company'), '')
  )) <> 'AT';

-- Segundo pase: contratos sin match en providers pero con texto en payload
update public.contratos_equipo ce
set compania = coalesce(
  nullif(trim(ce.at_payload->>'provider_name'), ''),
  nullif(trim(ce.at_payload->>'compania_nombre'), ''),
  nullif(trim(ce.at_payload->>'proveedor_nombre'), ''),
  nullif(trim(ce.at_payload->>'billing_company_name'), ''),
  nullif(trim(ce.at_payload->>'company_name'), ''),
  nullif(trim(ce.at_payload->>'compania'), ''),
  nullif(trim(ce.at_payload->>'company'), ''),
  nullif(trim(ce.at_payload->'provider'->>'nombre'), ''),
  nullif(trim(ce.at_payload->'provider'->>'name'), '')
)
where ce.source = 'at'
  and (
    ce.compania is null
    or trim(ce.compania) = ''
    or upper(trim(ce.compania)) = 'AT'
    or ce.compania = 'Sin compañía'
  )
  and coalesce(
    nullif(trim(ce.at_payload->>'provider_name'), ''),
    nullif(trim(ce.at_payload->>'compania_nombre'), ''),
    nullif(trim(ce.at_payload->>'proveedor_nombre'), ''),
    nullif(trim(ce.at_payload->>'billing_company_name'), ''),
    nullif(trim(ce.at_payload->>'company_name'), ''),
    nullif(trim(ce.at_payload->>'compania'), ''),
    nullif(trim(ce.at_payload->>'company'), ''),
    nullif(trim(ce.at_payload->'provider'->>'nombre'), ''),
    nullif(trim(ce.at_payload->'provider'->>'name'), '')
  ) is not null
  and upper(coalesce(
    nullif(trim(ce.at_payload->>'provider_name'), ''),
    nullif(trim(ce.at_payload->>'compania'), ''),
    nullif(trim(ce.at_payload->>'company'), '')
  )) <> 'AT';

-- ------------------------------------------------------------------
-- 3) Corregir tarifa placeholder en contratos AT
-- ------------------------------------------------------------------
update public.contratos_equipo ce
set tarifa = coalesce(
  nullif(trim(ce.at_payload->>'tarifa'), ''),
  nullif(trim(ce.at_payload->>'rate_name'), ''),
  nullif(trim(ce.at_payload->>'tariff_name'), ''),
  nullif(trim(ce.at_payload->'electricity_data'->>'rate_name'), ''),
  nullif(trim(ce.at_payload->'electricity_data'->>'tariff_name'), ''),
  nullif(trim(ce.at_payload->'gas_data'->>'rate_name'), ''),
  nullif(trim(ce.at_payload->'gas_data'->>'tariff_name'), '')
)
where ce.source = 'at'
  and (
    ce.tarifa is null
    or trim(ce.tarifa) = ''
    or upper(trim(ce.tarifa)) = 'TARIFA AT'
  )
  and coalesce(
    nullif(trim(ce.at_payload->>'tarifa'), ''),
    nullif(trim(ce.at_payload->>'rate_name'), ''),
    nullif(trim(ce.at_payload->>'tariff_name'), ''),
    nullif(trim(ce.at_payload->'electricity_data'->>'rate_name'), ''),
    nullif(trim(ce.at_payload->'electricity_data'->>'tariff_name'), ''),
    nullif(trim(ce.at_payload->'gas_data'->>'rate_name'), ''),
    nullif(trim(ce.at_payload->'gas_data'->>'tariff_name'), '')
  ) is not null;

-- ------------------------------------------------------------------
-- 4) Vincular settlements AT huérfanos al contrato por at_contract_id
-- ------------------------------------------------------------------
update public.settlements s
set contrato_id = ce.id
from public.contratos_equipo ce
where s.source = 'at'
  and s.contrato_id is null
  and ce.at_contract_id is not null
  and ce.at_contract_id::text = coalesce(
    s.at_payload->>'contract_id',
    s.at_payload->>'contrato_id',
    s.at_payload->'contract'->>'id',
    s.at_payload->'contrato'->>'id',
    s.at_payload->>'contracts_id'
  );

-- 4b) Fallback: vincular por CUPS cuando hay un único contrato AT con ese CUPS
update public.settlements s
set contrato_id = match.contrato_id
from (
  select
    s2.id as settlement_id,
    min(ce.id::text)::uuid as contrato_id
  from public.settlements s2
  join public.contratos_equipo ce
    on ce.source = 'at'
   and upper(trim(ce.cups)) = upper(trim(coalesce(
     nullif(s2.at_payload->>'cups', ''),
     nullif(s2.at_payload->'electricity_data'->>'cups', ''),
     nullif(s2.at_payload->'electricity_data'->>'CUPS', ''),
     nullif(s2.at_payload->'gas_data'->>'cups', ''),
     nullif(s2.at_payload->'gas_data'->>'CUPS', '')
   )))
  where s2.source = 'at'
    and s2.contrato_id is null
    and coalesce(
      nullif(s2.at_payload->>'cups', ''),
      nullif(s2.at_payload->'electricity_data'->>'cups', ''),
      nullif(s2.at_payload->'electricity_data'->>'CUPS', ''),
      nullif(s2.at_payload->'gas_data'->>'cups', ''),
      nullif(s2.at_payload->'gas_data'->>'CUPS', '')
    ) is not null
  group by s2.id
  having count(distinct ce.id) = 1
) match
where s.id = match.settlement_id
  and s.contrato_id is null;

-- ------------------------------------------------------------------
-- 5) Mejorar descripciones genéricas "Liquidación AT %"
-- (settlements no tienen columna compania; la UI la deriva del contrato)
-- ------------------------------------------------------------------
update public.settlements s
set descripcion = 'Liquidación ' || ce.client_name
from public.contratos_equipo ce
where s.contrato_id = ce.id
  and s.source = 'at'
  and s.descripcion ~* E'^liquidaci[oó]n\s+at\s+';

-- ------------------------------------------------------------------
-- 6) Verificación post-corrección
-- ------------------------------------------------------------------
select count(*) as contratos_aun_con_at
from public.contratos_equipo
where source = 'at'
  and upper(trim(compania)) = 'AT';

select count(*) as settlements_sin_contrato
from public.settlements
where source = 'at'
  and contrato_id is null;

-- rollback; -- descomentar para simular sin persistir
-- commit;
