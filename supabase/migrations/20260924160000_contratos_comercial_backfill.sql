-- Hereda comercial_id / jefe_equipo desde clientes; backfill Pablo Gutierrez + CUPS indicados.

begin;

create or replace function public.inherit_contratos_comercial_from_cliente()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update contratos_equipo c
  set
    comercial_id = cl.comercial_id,
    comercial_name = coalesce(nullif(trim(c.comercial_name), ''), up.full_name),
    nombre_comercial = coalesce(nullif(trim(c.nombre_comercial), ''), up.full_name),
    jefe_equipo = coalesce(c.jefe_equipo, up.manager_id),
    updated_at = now()
  from clientes cl
  inner join user_profiles up on up.id = cl.comercial_id
  where c.cliente_id = cl.id
    and cl.comercial_id is not null
    and (c.comercial_id is null or c.comercial_id is distinct from cl.comercial_id);

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

comment on function public.inherit_contratos_comercial_from_cliente() is
  'Rellena comercial_id y jefe_equipo en contratos desde el cliente ERP vinculado.';

-- Clientes de los CUPS de Pablo → comercial Pablo
update clientes cl
set comercial_id = 'd9148f58-1c60-4806-84d5-029d94276d1a'::uuid
from contratos_equipo c
where c.cliente_id = cl.id
  and upper(replace(c.cups, ' ', '')) in (
    'ES0031102226051017YF',
    'ES0031101342932001AP0F',
    'ES0031105480073002JR',
    'ES0031104072156009VV0F',
    'ES0031102542617002SH',
    'ES0031102278883001QW0F'
  );

-- Contratos explícitos Pablo + jefe Ricardo Monsalve
update contratos_equipo c
set
  comercial_id = 'd9148f58-1c60-4806-84d5-029d94276d1a'::uuid,
  comercial_name = 'Pablo Gutierrez',
  nombre_comercial = 'Pablo Gutierrez',
  jefe_equipo = '83cabea3-8cbb-4c57-b300-9ecc38410882'::uuid,
  updated_at = now()
where upper(replace(c.cups, ' ', '')) in (
  'ES0031102226051017YF',
  'ES0031101342932001AP0F',
  'ES0031105480073002JR',
  'ES0031104072156009VV0F',
  'ES0031102542617002SH',
  'ES0031102278883001QW0F'
);

-- Resto: contratos con cliente ya asignado a Pablo
update contratos_equipo c
set
  comercial_id = 'd9148f58-1c60-4806-84d5-029d94276d1a'::uuid,
  comercial_name = 'Pablo Gutierrez',
  nombre_comercial = 'Pablo Gutierrez',
  jefe_equipo = '83cabea3-8cbb-4c57-b300-9ecc38410882'::uuid,
  updated_at = now()
from clientes cl
where c.cliente_id = cl.id
  and cl.comercial_id = 'd9148f58-1c60-4806-84d5-029d94276d1a'::uuid
  and c.comercial_id is null;

select public.inherit_contratos_comercial_from_cliente();

commit;
