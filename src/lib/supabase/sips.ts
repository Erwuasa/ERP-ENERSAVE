import { parseSipsResponse } from "../sips/parse-response"
import type { SipsOutcome, SipsProducto } from "../sips/types"
import { resolveSupabaseClient } from "./result"

function envUrl() {
  return String(import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "").replace(
    /\/$/,
    ""
  )
}

function envAnonKey() {
  return String(import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
}

const FAILURE_MESSAGE = "No se pudo consultar SIPS."

/**
 * Calls the enertech-sips-lookup Edge Function (the provider key never reaches the browser)
 * and maps the answer to a SipsOutcome. `force` skips the internal cache.
 */
export async function lookupSips(
  cups: string,
  producto: SipsProducto = "luz",
  options: { force?: boolean } = {}
): Promise<SipsOutcome> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    return { status: "error", code: "NOT_CONFIGURED", message: resolved.message }
  }

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { status: "error", code: "UNAUTHORIZED", message: "Sesión no válida. Vuelve a iniciar sesión." }
  }

  try {
    const response = await fetch(`${envUrl()}/functions/v1/enertech-sips-lookup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: envAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cups, producto, force: options.force === true }),
    })
    const body = await response.json().catch(() => null)
    return parseSipsResponse(response.status, body, response.headers.get("retry-after"))
  } catch {
    return { status: "error", code: "UPSTREAM", message: FAILURE_MESSAGE }
  }
}

export interface SipsHistoryEntry {
  id: string
  cups: string
  producto: SipsProducto
  estado: "listo" | "procesando" | "sin_datos" | "error"
  fromCache: boolean
  createdAt: string
}

/** Latest lookups visible to the current user (RLS: own rows, or all for superadmin). */
export async function listRecentSipsLookups(limit = 10): Promise<SipsHistoryEntry[]> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return []

  const { data, error } = await resolved.client
    .from("enertech_sips_consultas")
    .select("id, cups, producto, estado, from_cache, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    cups: String(row.cups),
    producto: row.producto === "gas" ? "gas" : "luz",
    estado: row.estado,
    fromCache: row.from_cache === true,
    createdAt: String(row.created_at),
  }))
}
