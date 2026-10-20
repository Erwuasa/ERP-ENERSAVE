import { getSupabaseClient } from "@/lib/supabase/client"
import type { InvoiceAiPublicPayload } from "./invoice-ai-types"

function resolveSupabaseProjectUrl(): string | undefined {
  const fromEnv =
    (import.meta.env.SUPABASE_URL as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  return fromEnv?.trim().replace(/\/$/, "") || undefined
}

function resolveAnonKey(): string {
  return String(import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
}

function resolveEndpoint(): string | null {
  const base = resolveSupabaseProjectUrl()
  if (!base) return null
  return `${base}/functions/v1/invoice-ai-enersave`
}

/** True cuando la URL de Supabase está configurada. La clave de Gemini no sale del servidor. */
export function isInvoiceAiGeminiConfigured(): boolean {
  return Boolean(resolveEndpoint())
}

export async function analyzeInvoiceWithGemini(
  files: File[],
  options?: { onProgress?: (message: string) => void }
): Promise<InvoiceAiPublicPayload> {
  const endpoint = resolveEndpoint()
  if (!endpoint) throw new Error("Invoice AI (Gemini) no configurada (VITE_SUPABASE_URL).")
  if (files.length === 0) throw new Error("No hay archivos para analizar.")

  const client = getSupabaseClient()
  if (!client) throw new Error("Invoice AI (Gemini) no configurada (VITE_SUPABASE_URL).")

  const { data } = await client.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("Sesión no activa. Inicia sesión para analizar facturas.")

  const fd = new FormData()
  files.forEach((file, index) => {
    fd.append(index === 0 ? "file" : `file_${index}`, file)
  })

  options?.onProgress?.("Enviando factura a Gemini…")

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  const anonKey = resolveAnonKey()
  if (anonKey) headers.apikey = anonKey

  const res = await fetch(endpoint, {
    method: "POST",
    body: fd,
    headers,
  })

  const body = (await res.json().catch(() => null)) as
    | (InvoiceAiPublicPayload & { message?: string })
    | null

  if (!res.ok || !body) {
    throw new Error(body?.message || `Invoice AI (Gemini) HTTP ${res.status}`)
  }
  if (body.status === "error") {
    throw new Error(body.message || "Error en análisis de factura con Gemini")
  }

  options?.onProgress?.("Datos recibidos.")
  return body
}
