-- Historial auditable de cambios de estado en incidencias
-- Idempotente — seguro re-ejecutar en Supabase remoto

begin;

alter table public.incidencias
  add column if not exists historial_estados jsonb not null default '[]'::jsonb;

comment on column public.incidencias.historial_estados is
  'Array JSON de transiciones: { estado, fecha, motivo?, cambiadoPor }';

commit;
