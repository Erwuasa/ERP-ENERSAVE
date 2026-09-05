-- Timeline, documentos y emails AT por contrato (solo GET)

alter table public.contratos_equipo
  add column if not exists at_events jsonb not null default '[]'::jsonb,
  add column if not exists at_documents jsonb not null default '[]'::jsonb,
  add column if not exists at_emails jsonb not null default '[]'::jsonb;

comment on column public.contratos_equipo.at_events is
  'Timeline GET /v1/contracts/{id}/events. Sync incremental o al abrir el drawer.';
comment on column public.contratos_equipo.at_documents is
  'Documentos GET /v1/contracts/{id}/documents.';
comment on column public.contratos_equipo.at_emails is
  'Emails GET /v1/contracts/{id}/emails.';
