import {
  documentacionSearchParams,
  parseDocumentacionResponse,
  type DocumentacionConsulta,
  type DocumentacionResultado,
} from "@/lib/enertech/documentacion"
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

function fallo(): DocumentacionResultado {
  return { fase: "error", obligatorios: [] }
}

/** La clave de Enertech se queda en la Edge Function `enertech-documentacion`. */
export async function lookupEnertechDocumentacion(
  consulta: DocumentacionConsulta
): Promise<DocumentacionResultado> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return fallo()

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return fallo()

  try {
    const response = await fetch(`${envUrl()}/functions/v1/enertech-documentacion`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: envAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: documentacionSearchParams(consulta) }),
    })
    const body = await response.json().catch(() => null)
    return parseDocumentacionResponse(response.status, body)
  } catch {
    return fallo()
  }
}
