-- Outbound log for Enertech POST /clientes and POST /contratos.
-- Written only by the enertech-alta Edge Function (service role bypasses RLS).
-- Staff read the rows. Closing reconciliation goes through
-- mark_enertech_outbound_reconciliation_v1, not a direct UPDATE.
-- Do not store documentos[].base64: the function strips `documentos` before insert.

create table if not exists public.enertech_outbound_events (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  contract_id uuid null references public.contratos_equipo (id) on delete set null,
  user_id uuid null references auth.users (id) on delete set null,
  resource text not null check (resource in ('clientes', 'contratos')),
  idempotency_key text null,
  request_body jsonb not null,
  http_status integer null,
  response_body jsonb null,
  enertech_customer_id integer null,
  enertech_contract_id integer null,
  error_code text null,
  error_message text null,
  documents_count integer null,
  documents_total_bytes integer null,
  documents_rejected boolean not null default false,
  reconciliation_status text not null default 'pending'
    check (reconciliation_status in ('pending', 'ok', 'orphan', 'not_applicable')),
  reconciliation_note text null
);

comment on table public.enertech_outbound_events is
  'Audit log of ERP calls to Enertech POST /clientes and POST /contratos. request_body never includes documentos base64.';

comment on column public.enertech_outbound_events.reconciliation_status is
  'orphan: Enertech returned 2xx with an id but the ERP failed to store it. not_applicable: POST /clientes.';

create index if not exists enertech_outbound_events_sent_at_idx
  on public.enertech_outbound_events (sent_at desc);

create index if not exists enertech_outbound_events_contract_sent_at_idx
  on public.enertech_outbound_events (contract_id, sent_at desc);

create index if not exists enertech_outbound_events_orphan_idx
  on public.enertech_outbound_events (reconciliation_status)
  where reconciliation_status = 'orphan';

alter table public.enertech_outbound_events enable row level security;

drop policy if exists enertech_outbound_events_select_staff on public.enertech_outbound_events;
create policy enertech_outbound_events_select_staff
  on public.enertech_outbound_events
  for select
  to authenticated
  using ((select private.is_staff()));

revoke all on table public.enertech_outbound_events from public, anon, authenticated;
grant select on table public.enertech_outbound_events to authenticated;

create or replace function public.mark_enertech_outbound_reconciliation_v1(
  p_event_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_email text;
begin
  select role, email
    into actor_role, actor_email
  from public.user_profiles
  where id = auth.uid();

  if actor_role is distinct from 'tramitacion'
     and not (
       actor_role = 'superadmin'
       and lower(coalesce(actor_email, '')) = 'germanbayonr@gmail.com'
     ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_status not in ('ok', 'orphan', 'not_applicable') then
    raise exception 'invalid reconciliation status' using errcode = '22023';
  end if;

  update public.enertech_outbound_events
     set reconciliation_status = p_status,
         reconciliation_note = nullif(left(coalesce(p_note, ''), 500), '')
   where id = p_event_id;

  if not found then
    raise exception 'outbound event not found' using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.mark_enertech_outbound_reconciliation_v1(uuid, text, text) is
  'Staff (tramitacion or owner superadmin) closes an outbound Enertech log row. Does not change the request or response.';

revoke all on function public.mark_enertech_outbound_reconciliation_v1(uuid, text, text) from public, anon;
grant execute on function public.mark_enertech_outbound_reconciliation_v1(uuid, text, text) to authenticated;
