import { resolveSupabaseClient, type SupabaseResult } from "./result"

export interface AtContractNote {
  id?: string
  note: string
  createdAt?: string
  authorSide?: string
}

export interface AtContractEvent {
  id?: string
  type?: string
  title?: string
  fromStatus?: string
  toStatus?: string
  actor?: string
  createdAt?: string
}

export interface AtContractDocument {
  id?: string
  name: string
  type?: string
  url?: string
  size?: string
  mime?: string
  createdAt?: string
}

export interface AtContractEmail {
  id?: string
  subject?: string
  to?: string
  status?: string
  createdAt?: string
}

export interface AtContractExtras {
  status: string | null
  statusNote: string | null
  incidentAt: string | null
  notes: AtContractNote[]
  events: AtContractEvent[]
  documents: AtContractDocument[]
  emails: AtContractEmail[]
}

function envUrl() {
  return String(
    import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || ""
  ).replace(/\/$/, "")
}

function envAnonKey() {
  return String(
    import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ""
  )
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function mapNotes(rows: Array<Record<string, unknown>> | undefined): AtContractNote[] {
  return (rows ?? []).map((note) => ({
    id: asText(note.id),
    note: String(note.note ?? ""),
    createdAt: asText(note.created_at) ?? asText(note.createdAt),
    authorSide: asText(note.author_side) ?? asText(note.authorSide),
  }))
}

function mapEvents(rows: Array<Record<string, unknown>> | undefined): AtContractEvent[] {
  return (rows ?? []).map((event) => ({
    id: asText(event.id),
    type: asText(event.type),
    title: asText(event.title),
    fromStatus: asText(event.from_status) ?? asText(event.fromStatus),
    toStatus: asText(event.to_status) ?? asText(event.toStatus),
    actor: asText(event.actor),
    createdAt: asText(event.created_at) ?? asText(event.createdAt),
  }))
}

function mapDocuments(rows: Array<Record<string, unknown>> | undefined): AtContractDocument[] {
  return (rows ?? []).map((doc) => ({
    id: asText(doc.id),
    name: asText(doc.name) ?? "Documento AT",
    type: asText(doc.type),
    url: asText(doc.url),
    size: asText(doc.size),
    mime: asText(doc.mime),
    createdAt: asText(doc.created_at) ?? asText(doc.createdAt),
  }))
}

function mapEmails(rows: Array<Record<string, unknown>> | undefined): AtContractEmail[] {
  return (rows ?? []).map((email) => ({
    id: asText(email.id),
    subject: asText(email.subject),
    to: asText(email.to),
    status: asText(email.status),
    createdAt: asText(email.created_at) ?? asText(email.createdAt),
  }))
}

export async function fetchAtContractExtras(input: {
  atContractId: string
  contratoId?: string
}): Promise<SupabaseResult<AtContractExtras>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { ok: false, reason: "error", message: "Inicia sesión para leer datos AT." }
  }

  const response = await fetch(`${envUrl()}/functions/v1/at-contract-notes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: envAnonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      at_contract_id: input.atContractId,
      contrato_id: input.contratoId,
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: string
        status?: string | null
        status_note?: string | null
        incident_at?: string | null
        notes?: Array<Record<string, unknown>>
        events?: Array<Record<string, unknown>>
        documents?: Array<Record<string, unknown>>
        emails?: Array<Record<string, unknown>>
      }
    | null

  if (!response.ok) {
    return {
      ok: false,
      reason: "error",
      message: payload?.error ?? `No se pudieron leer los datos AT (${response.status}).`,
    }
  }

  return {
    ok: true,
    data: {
      status: payload?.status ?? null,
      statusNote: payload?.status_note ?? null,
      incidentAt: payload?.incident_at ?? null,
      notes: mapNotes(payload?.notes),
      events: mapEvents(payload?.events),
      documents: mapDocuments(payload?.documents),
      emails: mapEmails(payload?.emails),
    },
  }
}
