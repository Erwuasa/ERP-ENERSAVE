-- Enertech contract-status-change webhook: event log.
--
-- We deliberately did NOT mirror enertech_clientes/enertech_contratos (see
-- AGENTS.md §9: anti-duplication decision), so there is no local table yet
-- that maps an Enertech contrato id to our contratos_equipo rows. This table
-- only records verified webhook deliveries for audit/manual follow-up; wiring
-- it to automatically update contratos_equipo needs a matching strategy
-- (CUPS? an external_id column?) that hasn't been designed yet.
create table if not exists public.enertech_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  external_event_id text,
  signature_valid boolean not null,
  headers jsonb not null default '{}'::jsonb,
  payload jsonb,
  raw_body text,
  processed boolean not null default false,
  processing_note text
);

comment on table public.enertech_webhook_events is
  'Raw log of inbound Enertech contract-status-change webhook deliveries (signature verified in the enertech-contract-webhook Edge Function). Not yet wired to update contratos_equipo automatically.';

create unique index if not exists enertech_webhook_events_external_event_id_key
  on public.enertech_webhook_events (external_event_id)
  where external_event_id is not null;

create index if not exists enertech_webhook_events_received_at_idx
  on public.enertech_webhook_events (received_at desc);

alter table public.enertech_webhook_events enable row level security;

-- Written only by the Edge Function via the service role key (bypasses RLS).
-- Staff can read for audit/debugging; nobody else gets any access.
create policy enertech_webhook_events_select_staff
  on public.enertech_webhook_events
  for select
  using (private.is_staff());
