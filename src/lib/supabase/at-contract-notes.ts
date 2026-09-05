import { resolveSupabaseClient, type SupabaseResult } from "./result"

export interface AtContractNote {
  id?: string
  note: string
  createdAt?: string
  authorSide?: string
}

export interface AtContractExtras {
  status: string | null
  statusNote: string | null
  incidentAt: string | null
  notes: AtContractNote[]
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

export async function fetchAtContractExtras(input: {
  atContractId: string
  contratoId?: string
}): Promise<SupabaseResult<AtContractExtras>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { ok: false, reason: "error", message: "Inicia sesión para leer notas AT." }
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
      }
    | null

  if (!response.ok) {
    return {
      ok: false,
      reason: "error",
      message: payload?.error ?? `No se pudieron leer las notas AT (${response.status}).`,
    }
  }

  return {
    ok: true,
    data: {
      status: payload?.status ?? null,
      statusNote: payload?.status_note ?? null,
      incidentAt: payload?.incident_at ?? null,
      notes: (payload?.notes ?? []).map((note) => ({
        id: typeof note.id === "string" ? note.id : undefined,
        note: String(note.note ?? ""),
        createdAt:
          typeof note.created_at === "string"
            ? note.created_at
            : typeof note.createdAt === "string"
              ? note.createdAt
              : undefined,
        authorSide:
          typeof note.author_side === "string"
            ? note.author_side
            : typeof note.authorSide === "string"
              ? note.authorSide
              : undefined,
      })),
    },
  }
}
