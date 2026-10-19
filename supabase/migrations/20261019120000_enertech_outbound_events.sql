-- Tabla de auditoría de llamadas salientes hacia la API de Enertech.
-- Cada POST /clientes o POST /contratos que el ERP dispara queda registrado aquí,
-- tanto si tiene éxito como si falla, para que el superadmin pueda depurar incidencias.

create table if not exists public.enertech_outbound_events (
  id                       uuid        not null default gen_random_uuid() primary key,
  sent_at                  timestamptz not null default now(),

  -- Contexto del ERP
  contract_id              uuid        null references public.contratos_equipo(id) on delete set null,
  user_id                  uuid        null references auth.users(id) on delete set null,

  -- Llamada
  resource                 text        not null check (resource in ('clientes', 'contratos')),
  idempotency_key          text        null,
  -- Cuerpo enviado a Enertech SIN el campo documentos[].base64 (se omite antes de insertar).
  request_body             jsonb       not null default '{}',

  -- Resultado de Enertech
  http_status              integer     null,
  response_body            jsonb       null,
  enertech_customer_id     integer     null,
  enertech_contract_id     integer     null,
  error_code               text        null,
  error_message            text        null,

  -- Documentos adjuntos (solo metadatos; el base64 nunca se almacena)
  documents_count          integer     null,
  documents_total_bytes    bigint      null,
  documents_rejected       boolean     not null default false,

  -- Reconciliación: ¿se pudo guardar el id de Enertech en contratos_equipo?
  -- 'pending'        = la llamada aún no ha terminado (fila insertada antes de llamar)
  -- 'ok'             = POST 2xx + updateTeamContract exitoso
  -- 'orphan'         = POST 2xx + idContract, pero updateTeamContract falló
  -- 'not_applicable' = resource='clientes' (no hay contrato local que reconciliar)
  reconciliation_status    text        not null default 'pending'
                           check (reconciliation_status in ('pending', 'ok', 'orphan', 'not_applicable')),
  reconciliation_note      text        null
);

-- Índices
create index if not exists enertech_outbound_events_sent_at_idx
  on public.enertech_outbound_events (sent_at desc);

create index if not exists enertech_outbound_events_contract_id_idx
  on public.enertech_outbound_events (contract_id, sent_at desc)
  where contract_id is not null;

create index if not exists enertech_outbound_events_orphan_idx
  on public.enertech_outbound_events (sent_at desc)
  where reconciliation_status = 'orphan';

-- RLS
alter table public.enertech_outbound_events enable row level security;

-- Solo staff puede leer; la Edge Function usa service role para escribir (bypass RLS)
create policy "staff_select_enertech_outbound_events"
  on public.enertech_outbound_events
  for select
  to authenticated
  using (private.is_staff());

comment on table public.enertech_outbound_events is
  'Auditoría de llamadas salientes hacia la API de Enertech (POST /clientes y POST /contratos). '
  'Los campos documents_count y documents_total_bytes registran el volumen de adjuntos, '
  'pero el base64 nunca se almacena aquí. reconciliation_status=''orphan'' indica que Enertech '
  'creó el contrato pero el ERP no pudo guardar su id en contratos_equipo.metadata.';
