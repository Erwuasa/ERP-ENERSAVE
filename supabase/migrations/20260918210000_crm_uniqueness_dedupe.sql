-- Un cliente = un NIF. Un contrato = un CUPS + tipo + estado del mismo cliente.
-- Limpia duplicados actuales y deja índices únicos para que no vuelvan a entrar.

begin;

with scored_clients as (
  select
    c.id,
    upper(regexp_replace(btrim(c.nif_cif), '[\s.-]', '', 'g')) as nif_norm,
    (
      select count(*)::int
      from public.contratos_equipo ce
      where ce.cliente_id = c.id
    ) as contract_count,
    c.created_at
  from public.clientes c
  where c.nif_cif is not null
    and btrim(c.nif_cif) <> ''
),
ranked_clients as (
  select
    *,
    row_number() over (
      partition by nif_norm
      order by contract_count desc, created_at asc, id asc
    ) as rn
  from scored_clients
  where nif_norm <> ''
),
client_winners as (
  select id, nif_norm from ranked_clients where rn = 1
),
client_losers as (
  select l.id, w.id as winner_id
  from ranked_clients l
  join client_winners w on w.nif_norm = l.nif_norm
  where l.rn > 1
)
update public.contratos_equipo ce
set cliente_id = cl.winner_id
from client_losers cl
where ce.cliente_id = cl.id;

with scored_clients as (
  select
    c.id,
    upper(regexp_replace(btrim(c.nif_cif), '[\s.-]', '', 'g')) as nif_norm,
    (
      select count(*)::int
      from public.contratos_equipo ce
      where ce.cliente_id = c.id
    ) as contract_count,
    c.created_at
  from public.clientes c
  where c.nif_cif is not null
    and btrim(c.nif_cif) <> ''
),
ranked_clients as (
  select
    *,
    row_number() over (
      partition by nif_norm
      order by contract_count desc, created_at asc, id asc
    ) as rn
  from scored_clients
  where nif_norm <> ''
),
client_winners as (
  select id, nif_norm from ranked_clients where rn = 1
),
client_losers as (
  select l.id, w.id as winner_id
  from ranked_clients l
  join client_winners w on w.nif_norm = l.nif_norm
  where l.rn > 1
)
update public.incidencias i
set cliente_id = cl.winner_id
from client_losers cl
where i.cliente_id = cl.id;

with scored_clients as (
  select
    c.id,
    upper(regexp_replace(btrim(c.nif_cif), '[\s.-]', '', 'g')) as nif_norm,
    (
      select count(*)::int
      from public.contratos_equipo ce
      where ce.cliente_id = c.id
    ) as contract_count,
    c.created_at
  from public.clientes c
  where c.nif_cif is not null
    and btrim(c.nif_cif) <> ''
),
ranked_clients as (
  select
    *,
    row_number() over (
      partition by nif_norm
      order by contract_count desc, created_at asc, id asc
    ) as rn
  from scored_clients
  where nif_norm <> ''
),
client_losers as (
  select id
  from ranked_clients
  where rn > 1
)
delete from public.clientes c
using client_losers l
where c.id = l.id;

drop index if exists public.idx_clientes_nif_cif_comercial;

create unique index if not exists idx_clientes_nif_cif_normalized
  on public.clientes (upper(regexp_replace(btrim(nif_cif), '[\s.-]', '', 'g')))
  where nif_cif is not null and btrim(nif_cif) <> '';

with scored_contracts as (
  select
    id,
    upper(regexp_replace(coalesce(cups, ''), '\s', '', 'g')) as cups_norm,
    tipo,
    estado,
    cliente_id,
    updated_at,
    created_at
  from public.contratos_equipo
  where cups is not null
    and btrim(cups) <> ''
),
ranked_contracts as (
  select
    *,
    row_number() over (
      partition by cups_norm, tipo, estado, coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc, id asc
    ) as rn
  from scored_contracts
  where cups_norm <> ''
),
contract_map as (
  select
    l.id as loser_id,
    w.id as winner_id
  from ranked_contracts l
  join ranked_contracts w
    on w.cups_norm = l.cups_norm
   and w.tipo = l.tipo
   and w.estado = l.estado
   and w.cliente_id is not distinct from l.cliente_id
   and w.rn = 1
  where l.rn > 1
)
delete from public.settlements s
using contract_map m
where s.contrato_id = m.loser_id
  and exists (
    select 1
    from public.settlements sw
    where sw.contrato_id = m.winner_id
      and sw.tipo_evento is not distinct from s.tipo_evento
  );

with scored_contracts as (
  select
    id,
    upper(regexp_replace(coalesce(cups, ''), '\s', '', 'g')) as cups_norm,
    tipo,
    estado,
    cliente_id,
    updated_at,
    created_at
  from public.contratos_equipo
  where cups is not null
    and btrim(cups) <> ''
),
ranked_contracts as (
  select
    *,
    row_number() over (
      partition by cups_norm, tipo, estado, coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc, id asc
    ) as rn
  from scored_contracts
  where cups_norm <> ''
),
contract_map as (
  select
    l.id as loser_id,
    w.id as winner_id
  from ranked_contracts l
  join ranked_contracts w
    on w.cups_norm = l.cups_norm
   and w.tipo = l.tipo
   and w.estado = l.estado
   and w.cliente_id is not distinct from l.cliente_id
   and w.rn = 1
  where l.rn > 1
)
update public.settlements s
set contrato_id = m.winner_id
from contract_map m
where s.contrato_id = m.loser_id;

with scored_contracts as (
  select
    id,
    upper(regexp_replace(coalesce(cups, ''), '\s', '', 'g')) as cups_norm,
    tipo,
    estado,
    cliente_id,
    updated_at,
    created_at
  from public.contratos_equipo
  where cups is not null
    and btrim(cups) <> ''
),
ranked_contracts as (
  select
    *,
    row_number() over (
      partition by cups_norm, tipo, estado, coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc, id asc
    ) as rn
  from scored_contracts
  where cups_norm <> ''
),
contract_map as (
  select
    l.id as loser_id,
    w.id as winner_id
  from ranked_contracts l
  join ranked_contracts w
    on w.cups_norm = l.cups_norm
   and w.tipo = l.tipo
   and w.estado = l.estado
   and w.cliente_id is not distinct from l.cliente_id
   and w.rn = 1
  where l.rn > 1
)
update public.incidencias i
set contrato_id = m.winner_id
from contract_map m
where i.contrato_id = m.loser_id;

with scored_contracts as (
  select
    id,
    upper(regexp_replace(coalesce(cups, ''), '\s', '', 'g')) as cups_norm,
    tipo,
    estado,
    cliente_id,
    updated_at,
    created_at
  from public.contratos_equipo
  where cups is not null
    and btrim(cups) <> ''
),
ranked_contracts as (
  select
    *,
    row_number() over (
      partition by cups_norm, tipo, estado, coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc, id asc
    ) as rn
  from scored_contracts
  where cups_norm <> ''
),
contract_map as (
  select
    l.id as loser_id,
    w.id as winner_id
  from ranked_contracts l
  join ranked_contracts w
    on w.cups_norm = l.cups_norm
   and w.tipo = l.tipo
   and w.estado = l.estado
   and w.cliente_id is not distinct from l.cliente_id
   and w.rn = 1
  where l.rn > 1
)
update public.alegaciones a
set contrato_id = m.winner_id
from contract_map m
where a.contrato_id = m.loser_id;

with scored_contracts as (
  select
    id,
    upper(regexp_replace(coalesce(cups, ''), '\s', '', 'g')) as cups_norm,
    tipo,
    estado,
    cliente_id,
    updated_at,
    created_at
  from public.contratos_equipo
  where cups is not null
    and btrim(cups) <> ''
),
ranked_contracts as (
  select
    *,
    row_number() over (
      partition by cups_norm, tipo, estado, coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc, id asc
    ) as rn
  from scored_contracts
  where cups_norm <> ''
),
contract_map as (
  select
    l.id as loser_id,
    w.id as winner_id
  from ranked_contracts l
  join ranked_contracts w
    on w.cups_norm = l.cups_norm
   and w.tipo = l.tipo
   and w.estado = l.estado
   and w.cliente_id is not distinct from l.cliente_id
   and w.rn = 1
  where l.rn > 1
)
update public.at_email_logs e
set contrato_id = m.winner_id
from contract_map m
where e.contrato_id = m.loser_id;

with scored_contracts as (
  select
    id,
    upper(regexp_replace(coalesce(cups, ''), '\s', '', 'g')) as cups_norm,
    tipo,
    estado,
    cliente_id,
    updated_at,
    created_at
  from public.contratos_equipo
  where cups is not null
    and btrim(cups) <> ''
),
ranked_contracts as (
  select
    *,
    row_number() over (
      partition by cups_norm, tipo, estado, coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc, id asc
    ) as rn
  from scored_contracts
  where cups_norm <> ''
),
contract_map as (
  select
    l.id as loser_id,
    w.id as winner_id
  from ranked_contracts l
  join ranked_contracts w
    on w.cups_norm = l.cups_norm
   and w.tipo = l.tipo
   and w.estado = l.estado
   and w.cliente_id is not distinct from l.cliente_id
   and w.rn = 1
  where l.rn > 1
)
update public.contrato_notas n
set contrato_id = m.winner_id
from contract_map m
where n.contrato_id = m.loser_id;

with scored_contracts as (
  select
    id,
    upper(regexp_replace(coalesce(cups, ''), '\s', '', 'g')) as cups_norm,
    tipo,
    estado,
    cliente_id,
    updated_at,
    created_at
  from public.contratos_equipo
  where cups is not null
    and btrim(cups) <> ''
),
ranked_contracts as (
  select
    *,
    row_number() over (
      partition by cups_norm, tipo, estado, coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc, id asc
    ) as rn
  from scored_contracts
  where cups_norm <> ''
),
contract_losers as (
  select id
  from ranked_contracts
  where rn > 1
)
delete from public.contratos_equipo c
using contract_losers l
where c.id = l.id;

create unique index if not exists idx_contratos_equipo_supply_unique
  on public.contratos_equipo (
    upper(regexp_replace(cups, '\s', '', 'g')),
    tipo,
    estado,
    coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where cups is not null and btrim(cups) <> '';

commit;
