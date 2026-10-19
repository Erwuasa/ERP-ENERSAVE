import { resolveSipsLookup } from "../sips/fast-lookup"
import { parseSipsResumen, parseSipsResponse } from "../sips/parse-response"
import type { SipsOutcome, SipsProducto } from "../sips/types"
import { resolveSupabaseClient } from "./result"

const LISTO_CACHE_MS = 30 * 24 * 60 * 60 * 1000

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
async function readStoredSipsListo(cups: string, producto: SipsProducto): Promise<SipsOutcome | null> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return null
  const since = new Date(Date.now() - LISTO_CACHE_MS).toISOString()
  const { data, error } = await resolved.client
    .from("enertech_sips_consultas")
    .select("cups, resumen, origen, consultado_en")
    .eq("cups", cups)
    .eq("producto", producto)
    .eq("estado", "listo")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data?.resumen) return null
  return {
    status: "listo",
    cups: String(data.cups || cups),
    resumen: parseSipsResumen(data.resumen),
    origen: typeof data.origen === "string" ? data.origen : null,
    consultadoEn: typeof data.consultado_en === "string" ? data.consultado_en : null,
  }
}

/** Cached SIPS row first, then the Edge Function. A processing answer is retried once, at most 3 s later. */
export async function lookupSipsPreferringCache(
  cups: string,
  producto: SipsProducto = "luz"
): Promise<SipsOutcome> {
  return resolveSipsLookup({
    cups,
    producto,
    readStored: () => readStoredSipsListo(cups, producto),
    fetchLive: () => lookupSips(cups, producto),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  })
}

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
