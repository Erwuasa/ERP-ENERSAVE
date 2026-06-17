-- DATA-05: Expand prospectos to 11-phase pipeline + PIPE-05 columns
-- Order: DROP CHECK → remap legacy fases → ADD columns → backfill → ADD CHECKs

begin;

alter table public.prospectos drop constraint if exists prospectos_fase_check;

update public.prospectos set fase = 'negociacion' where fase = 'documentacion';
update public.prospectos set fase = 'tramitacion' where fase = 'enviado';
update public.prospectos set fase = 'activado' where fase = 'cliente_activo';

alter table public.prospectos add column if not exists subtipo_prospecto text;
alter table public.prospectos add column if not exists fecha_proximo_contacto timestamptz;
alter table public.prospectos add column if not exists sub_estado text;
alter table public.prospectos add column if not exists motivo_con_dudas text;
alter table public.prospectos add column if not exists motivo_recontacto text;
alter table public.prospectos add column if not exists fecha_recontactar timestamptz;

update public.prospectos
set sub_estado = 'en_proceso'
where fase = 'tramitacion' and sub_estado is null;

alter table public.prospectos drop constraint if exists prospectos_subtipo_prospecto_check;
alter table public.prospectos drop constraint if exists prospectos_sub_estado_check;

alter table public.prospectos add constraint prospectos_fase_check check (
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

alter table public.prospectos add constraint prospectos_subtipo_prospecto_check check (
  subtipo_prospecto is null
  or subtipo_prospecto in ('base_datos', 'vecino_zona', 'contacto_previo', 'referido')
);

alter table public.prospectos add constraint prospectos_sub_estado_check check (
  sub_estado is null
  or sub_estado in ('en_proceso', 'incidencia_administrativa', 'pendiente_de_firma')
);

comment on column public.prospectos.subtipo_prospecto is 'PIPE-05: subtipo on prospecto_nuevo — validated in pipeline.ts';
comment on column public.prospectos.sub_estado is 'PIPE-05: tramitacion sub-state — validated in pipeline.ts';

commit;
