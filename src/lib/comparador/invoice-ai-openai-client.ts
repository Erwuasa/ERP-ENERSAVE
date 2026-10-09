import type { InvoiceAiPublicPayload } from "./invoice-ai-types"

// Cliente para la Edge Function `invoice-ai-openai` (ver supabase/functions/invoice-ai-openai)
// que sustituye al servicio de terceros como proveedor principal de IA para el comparador.
// Devuelve el mismo shape (subconjunto) de InvoiceAiPublicPayload, así que
// mapInvoiceAiToComparadorExtraction (invoice-ai-to-comparador.ts) se reutiliza sin cambios.

function resolveSupabaseProjectUrl(): string | undefined {
  const fromEnv =
    (import.meta.env.SUPABASE_URL as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  return fromEnv?.trim().replace(/\/$/, "") || undefined
}

function resolveEndpoint(): string | null {
  const base = resolveSupabaseProjectUrl()
  if (!base) return null
  return `${base}/functions/v1/invoice-ai-openai`
}

export function isInvoiceAiOpenAiConfigured(): boolean {
  return Boolean(resolveEndpoint())
}

export async function analyzeInvoiceWithOpenAi(
  files: File[],
  options?: { onProgress?: (message: string) => void }
): Promise<InvoiceAiPublicPayload> {
  const endpoint = resolveEndpoint()
  if (!endpoint) {
    throw new Error("Invoice AI (OpenAI) no configurada (VITE_SUPABASE_URL).")
  }
  if (files.length === 0) throw new Error("No hay archivos para analizar.")

  const fd = new FormData()
  files.forEach((file, index) => {
    fd.append(index === 0 ? "file" : `file_${index}`, file)
  })

  options?.onProgress?.("Enviando factura a la IA…")

  const clientKey = import.meta.env.VITE_INVOICE_AI_OPENAI_KEY as string | undefined
  const headers: Record<string, string> = {}
  if (clientKey?.trim()) headers["x-invoice-ai-key"] = clientKey.trim()

  const res = await fetch(endpoint, { method: "POST", body: fd, headers })
  const body = (await res.json().catch(() => null)) as (InvoiceAiPublicPayload & { message?: string }) | null

  if (!res.ok || !body) {
    throw new Error(body?.message || `Invoice AI (OpenAI) HTTP ${res.status}`)
  }
  if (body.status === "error") {
    throw new Error(body.message || "Error en análisis de factura con IA")
  }

  options?.onProgress?.("Datos recibidos.")
  return body
}
