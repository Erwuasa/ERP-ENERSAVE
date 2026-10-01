import type { InvoiceAiPublicPayload } from "./invoice-ai-types"

function resolveSupabaseProjectUrl(): string | undefined {
  const fromEnv =
    (import.meta.env.SUPABASE_URL as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  return fromEnv?.trim() || undefined
}

function normalizeInvoiceAiAssistantUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "")
  if (/\/functions\/v1\/ai-assistant(-development)?$/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed}/functions/v1/ai-assistant`
}

function resolveInvoiceAiEndpoint(): string | null {
  const override = import.meta.env.VITE_INVOICE_AI_ASSISTANT_URL as string | undefined
  const overrideTrimmed = override?.trim()
  if (
    overrideTrimmed &&
    !/tu-proyecto|example\.com|placeholder|your-project/i.test(overrideTrimmed)
  ) {
    return normalizeInvoiceAiAssistantUrl(overrideTrimmed)
  }

  const base = resolveSupabaseProjectUrl()
  if (!base) return null
  return normalizeInvoiceAiAssistantUrl(base.replace(/\/$/, ""))
}

export function isInvoiceAiConfigured(): boolean {
  const key = import.meta.env.VITE_INVOICE_AI_KEY as string | undefined
  return Boolean(key?.trim() && resolveInvoiceAiEndpoint())
}

function parseSseChunk(block: string, accumulated: InvoiceAiPublicPayload): InvoiceAiPublicPayload {
  const line = block.trim()
  if (!line.startsWith("data: ")) return accumulated
  try {
    const json = JSON.parse(line.slice(6)) as InvoiceAiPublicPayload
    if (json.status === "error") {
      throw new Error(json.message || "Error en análisis de factura")
    }
    if (json.status === "started" || json.status === "done") return { ...accumulated, ...json }
    return { ...accumulated, ...json }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Error en análisis")) throw err
    return accumulated
  }
}

export async function analyzeInvoiceWithAi(
  files: File[],
  options?: {
    onProgress?: (message: string) => void
    companyCandidates?: string[]
  }
): Promise<InvoiceAiPublicPayload> {
  const endpoint = resolveInvoiceAiEndpoint()
  const apiKey = import.meta.env.VITE_INVOICE_AI_KEY as string | undefined
  if (!endpoint || !apiKey?.trim()) {
    throw new Error("Invoice AI no configurada (VITE_INVOICE_AI_KEY / VITE_SUPABASE_URL).")
  }

  if (files.length === 0) throw new Error("No hay archivos para analizar.")
  const isPdf = files.length === 1 && files[0].type === "application/pdf"
  if (!isPdf && files.length > 3) {
    throw new Error("Máximo 3 imágenes de la misma factura.")
  }

  const fd = new FormData()
  fd.append("invoiceAiKey", apiKey.trim())
  fd.append("extractionType", "technical")
  fd.append("disableStreaming", "true")
  fd.append("skipDraftContract", "true")
  fd.append("skipTrainingDatasetInsert", "true")

  if (options?.companyCandidates?.length) {
    fd.append("companyCandidates", JSON.stringify(options.companyCandidates))
  }

  const primary = files[0]
  fd.append("file", primary)
  fd.append("file_0", primary)
  fd.append("fileName", primary.name)
  fd.append("fileType", primary.type || "application/octet-stream")
  if (files.length > 1) {
    files.forEach((file, index) => {
      fd.append(`file_${index}`, file)
    })
    fd.append("fileNames", files.map((f) => f.name).join(","))
  }

  options?.onProgress?.("Enviando factura a IA…")

  const res = await fetch(endpoint, { method: "POST", body: fd })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Invoice AI HTTP ${res.status}: ${text.slice(0, 400)}`)
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const json = (await res.json()) as InvoiceAiPublicPayload
    if (json.status === "error") throw new Error(json.message || "Error en análisis de factura")
    return json
  }

  options?.onProgress?.("Recibiendo datos…")
  const reader = res.body?.getReader()
  if (!reader) throw new Error("Respuesta streaming sin cuerpo.")

  const decoder = new TextDecoder()
  let buffer = ""
  let accumulated: InvoiceAiPublicPayload = {}

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() || ""
    for (const part of parts) {
      accumulated = parseSseChunk(part, accumulated)
    }
  }
  if (buffer.trim()) accumulated = parseSseChunk(buffer, accumulated)

  return accumulated
}
