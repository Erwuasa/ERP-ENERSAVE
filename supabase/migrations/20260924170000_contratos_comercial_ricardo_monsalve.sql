-- Backfill Ricardo Monsalve (jefe comercial) + corrige ES0021000004721610ZY (Pablo → Ricardo).

begin;

-- Clientes ligados a estos contratos → Ricardo
update clientes cl
set comercial_id = '83cabea3-8cbb-4c57-b300-9ecc38410882'::uuid
from contratos_equipo c
where c.cliente_id = cl.id
  and upper(replace(c.cups, ' ', '')) in (
    'ES0031102247488036KZ0F',
    'ES0218030030782277PG',
    'ES0031104118034005SM0F',
    'ES0031102244389020SH0F',
    'ES0031102266920002FQ0F',
    'ES0031102552598054XJ0F',
    'ES0031102275620001XN0F',
    'ES0021000004721610ZY',
    'ES0031102447938001PB0F',
    'ES0031102613612012VP0F',
    'ES0031102564181042XV0F',
    'ES0031102727495007BK'
  );

-- Contratos → Ricardo (director: jefe_equipo NULL)
update contratos_equipo c
set
  comercial_id = '83cabea3-8cbb-4c57-b300-9ecc38410882'::uuid,
  comercial_name = 'Ricardo Monsalve Gonzalez',
  nombre_comercial = 'Ricardo Monsalve Gonzalez',
  jefe_equipo = null,
  updated_at = now()
where upper(replace(c.cups, ' ', '')) in (
  'ES0031102247488036KZ0F',
  'ES0218030030782277PG',
  'ES0031104118034005SM0F',
  'ES0031102244389020SH0F',
  'ES0031102266920002FQ0F',
  'ES0031102552598054XJ0F',
  'ES0031102275620001XN0F',
  'ES0021000004721610ZY',
  'ES0031102447938001PB0F',
  'ES0031102613612012VP0F',
  'ES0031102564181042XV0F',
  'ES0031102727495007BK'
);

commit;
