-- Notas e incidencia AT por contrato (hilo del drawer de Helios)

alter table public.contratos_equipo
  add column if not exists at_status_note text,
  add column if not exists at_incident_at timestamptz,
  add column if not exists at_notes jsonb not null default '[]'::jsonb;

comment on column public.contratos_equipo.at_status_note is
  'Motivo de incidencia AT (contracts.status_note)';
comment on column public.contratos_equipo.at_incident_at is
  'Timestamp de incidencia AT (contracts.incident_at)';
comment on column public.contratos_equipo.at_notes is
  'Hilo GET /v1/contracts/{id}/notes. Solo se rellena en sync incremental.';
