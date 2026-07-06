-- Demo prospectos Ventas sincronizados con contratos ERP locales (IDs con-demo-*).
-- Re-ejecutable: solo inserta si no existe metadata.demo_seed_key.

begin;

-- Brownfield: el CHECK legacy puede no incluir tramitacion (11 fases Stage-Gate).
alter table public.prospectos
  drop constraint if exists prospectos_fase_check;

update public.prospectos
set fase = 'negociacion'
where fase = 'documentacion';

update public.prospectos
set fase = 'tramitacion'
where fase = 'enviado';

update public.prospectos
set fase = 'activado'
where fase = 'cliente_activo';

update public.prospectos
set fase = 'prospecto_nuevo'
where fase = 'nuevo';

update public.prospectos
set fase = 'propuesta_enviada'
where fase = 'propuesta';

update public.prospectos
set fase = 'activado'
where fase = 'cerrado';

update public.prospectos
set fase = 'descartado'
where fase = 'perdido';

alter table public.prospectos
  add constraint prospectos_fase_check check (
    fase in (
      'prospecto_nuevo',
      'contactado',
      'cualificado',
      'propuesta_enviada',
      'negociacion',
      'tramitacion',
      'pendiente_firma',
      'activado',
      'con_dudas',
      'descartado',
      'recontactar'
    )
  );

insert into public.prospectos (
  nombre_negocio,
  comercial_id,
  comercial_name,
  telefono,
  email,
  fase,
  cups,
  tipo_suministro,
  consumo_anual_kwh,
  compania_actual,
  tarifa_actual,
  provincia,
  subtipo_prospecto,
  metadata
)
select
  v.nombre,
  'usr-3',
  'Ignacio Ortiz',
  v.telefono,
  v.email,
  v.fase,
  v.cups,
  'luz',
  v.consumo_anual_kwh,
  v.compania_actual,
  v.tarifa_actual,
  v.provincia,
  v.subtipo_prospecto,
  jsonb_build_object(
    'demo_seed_key', v.seed_key,
    'contrato_equipo_id', v.contrato_equipo_id,
    'canal_origen', 'Demo sincronizado ERP'
  )
from (
  values
    (
      'demo-panaderia',
      'Panadería La Estrella SL',
      '612334455',
      'gerencia@laestrella.es',
      'tramitacion',
      'ES0021000001112222AB',
      18500::numeric,
      'Repsol',
      '2.0TD fija',
      'Madrid',
      'vecino_zona',
      'con-demo-panaderia'
    ),
    (
      'demo-taller',
      'Taller Viesgo Norte',
      '698776655',
      'taller@viesgo.es',
      'pendiente_firma',
      'ES0031105542292010LG',
      42000::numeric,
      'Naturgy',
      '3.0TD indexada',
      'Cádiz',
      'contacto_previo',
      'con-demo-taller'
    ),
    (
      'demo-cafe',
      'Cafetería Sol y Mar',
      '655443322',
      'info@cafe-solmar.es',
      'cualificado',
      'ES0021000000998877CD',
      9200::numeric,
      'TotalEnergies',
      null,
      'Sevilla',
      'referido',
      null
    )
) as v(
  seed_key,
  nombre,
  telefono,
  email,
  fase,
  cups,
  consumo_anual_kwh,
  compania_actual,
  tarifa_actual,
  provincia,
  subtipo_prospecto,
  contrato_equipo_id
)
where not exists (
  select 1
  from public.prospectos p
  where p.metadata ->> 'demo_seed_key' = v.seed_key
);

commit;
