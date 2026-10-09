// Invoice extraction backed by OpenAI (gpt-5.6-luna), replacing/augmenting the third-party
// "Invoice AI" service for the comparador's drag&drop invoice field (ver AGENTS.md y
// docs/comparador-invoice-ai-openai.md). Acepta imagenes o PDF directamente (vision + PDF
// input nativos de la Responses API) y devuelve JSON estructurado (json_schema strict) con
// el mismo shape (subconjunto) que InvoiceAiPublicPayload, para reusar sin tocar
// src/lib/comparador/invoice-ai-to-comparador.ts.
//
// Auth: igual que `ai-assistant` (no esta en la allowlist verify_jwt=false de config.toml),
// asi que requiere un JWT valido de Supabase -- incluye el anon key que usa la web publica
// como visitante anonimo. No hay gate de rol de staff: el comparador lo usan tanto el ERP
// como la web.
import { corsHeadersFor, handleOptions } from "../_shared/cors.ts"

const OPENAI_API_URL = "https://api.openai.com/v1/responses"
const OPENAI_MODEL = "gpt-5.6-luna"
const MAX_FILE_BYTES = 20 * 1024 * 1024 // margen bajo el limite de 50MB de OpenAI

interface ExtractedInvoicePayload {
  cups: string | null
  companyBrand: string | null
  segment: "residencial" | "pyme" | null
  supplyType: "luz" | "gas" | null
  electricityCategory: string | null
  invoiceDays: number | null
  powerKwByPeriod: number[]
  energyKwhByPeriod: number[]
  powerCostEur: number | null
  energyCostEur: number | null
  meterRentalAmount: number | null
  socialBonusCostEur: number | null
  financingSocialBonusAmount: number | null
  otherCosts: number | null
  totalAmountEur: number | null
  electricityTaxRegime: string | null
  invoiceDate: string | null
  holderNif: string | null
  iban: string | null
}

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cups: { type: ["string", "null"] },
    companyBrand: { type: ["string", "null"] },
    segment: { type: ["string", "null"], enum: ["residencial", "pyme", null] },
    supplyType: { type: ["string", "null"], enum: ["luz", "gas", null] },
    electricityCategory: { type: ["string", "null"], description: "Tarifa de acceso, p.ej. 2.0TD, 3.0TD" },
    invoiceDays: { type: ["number", "null"] },
    powerKwByPeriod: {
      type: "array",
      description: "Potencia contratada en kW por periodo P1..P6, 0 si el periodo no aplica",
      items: { type: "number" },
      minItems: 6,
      maxItems: 6,
    },
    energyKwhByPeriod: {
      type: "array",
      description: "Energia consumida en kWh por periodo P1..P6, 0 si el periodo no aplica",
      items: { type: "number" },
      minItems: 6,
      maxItems: 6,
    },
    powerCostEur: { type: ["number", "null"] },
    energyCostEur: { type: ["number", "null"] },
    meterRentalAmount: { type: ["number", "null"], description: "Alquiler de equipo de medida" },
    socialBonusCostEur: { type: ["number", "null"] },
    financingSocialBonusAmount: { type: ["number", "null"] },
    otherCosts: { type: ["number", "null"] },
    totalAmountEur: { type: ["number", "null"] },
    electricityTaxRegime: { type: ["string", "null"] },
    invoiceDate: { type: ["string", "null"], description: "Fecha de factura, formato ISO AAAA-MM-DD" },
    holderNif: { type: ["string", "null"] },
    iban: { type: ["string", "null"] },
  },
  required: [
    "cups",
    "companyBrand",
    "segment",
    "supplyType",
    "electricityCategory",
    "invoiceDays",
    "powerKwByPeriod",
    "energyKwhByPeriod",
    "powerCostEur",
    "energyCostEur",
    "meterRentalAmount",
    "socialBonusCostEur",
    "financingSocialBonusAmount",
    "otherCosts",
    "totalAmountEur",
    "electricityTaxRegime",
    "invoiceDate",
    "holderNif",
    "iban",
  ],
} as const

const SYSTEM_PROMPT = `Eres un extractor de datos de facturas de electricidad/gas españolas para una asesoria energetica.
Lee la factura adjunta (imagen o PDF) y devuelve SOLO los campos del esquema JSON pedido.
Reglas:
- Si un dato no aparece en la factura, usa null (o 0 en los arrays de potencia/energia por periodo).
- powerKwByPeriod y energyKwhByPeriod tienen SIEMPRE 6 posiciones (P1..P6 en orden); pon 0 en los periodos que la tarifa no usa.
- electricityCategory es la tarifa de acceso (ej. "2.0TD", "3.0TD", "6.1TD"), no el nombre comercial del producto.
- companyBrand es el nombre de la comercializadora (ej. "Naturgy", "Endesa", "TotalEnergies"), no el nombre de la tarifa.
- Los importes van en euros, con punto decimal (nunca coma).
- No inventes datos que no veas en la factura.`

function errorResponse(status: number, message: string, request: Request): Response {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { ...corsHeadersFor(request), "Content-Type": "application/json" },
  })
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  const base64 = btoa(binary)
  const mime = file.type || "application/octet-stream"
  return `data:${mime};base64,${base64}`
}

function buildFileContentPart(file: File, dataUrl: string): Record<string, unknown> {
  if (file.type === "application/pdf") {
    return { type: "input_file", filename: file.name || "factura.pdf", file_data: dataUrl }
  }
  return { type: "input_image", image_url: dataUrl, detail: "high" }
}

function extractOutputText(openAiResponse: unknown): string | null {
  const output = (openAiResponse as { output?: unknown })?.output
  if (!Array.isArray(output)) return null
  for (const item of output) {
    const content = (item as { content?: unknown })?.content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if ((part as { type?: string })?.type === "output_text" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text
      }
    }
  }
  return null
}

function normalizeExtractedPayload(raw: unknown): ExtractedInvoicePayload {
  const parsed = (raw ?? {}) as Partial<ExtractedInvoicePayload>
  const padPeriods = (value: unknown): number[] => {
    const arr = Array.isArray(value) ? value.map((n) => (typeof n === "number" && Number.isFinite(n) ? n : 0)) : []
    while (arr.length < 6) arr.push(0)
    return arr.slice(0, 6)
  }
  return {
    cups: parsed.cups ?? null,
    companyBrand: parsed.companyBrand ?? null,
    segment: parsed.segment === "pyme" || parsed.segment === "residencial" ? parsed.segment : null,
    supplyType: parsed.supplyType === "gas" || parsed.supplyType === "luz" ? parsed.supplyType : null,
    electricityCategory: parsed.electricityCategory ?? null,
    invoiceDays: typeof parsed.invoiceDays === "number" ? parsed.invoiceDays : null,
    powerKwByPeriod: padPeriods(parsed.powerKwByPeriod),
    energyKwhByPeriod: padPeriods(parsed.energyKwhByPeriod),
    powerCostEur: typeof parsed.powerCostEur === "number" ? parsed.powerCostEur : null,
    energyCostEur: typeof parsed.energyCostEur === "number" ? parsed.energyCostEur : null,
    meterRentalAmount: typeof parsed.meterRentalAmount === "number" ? parsed.meterRentalAmount : null,
    socialBonusCostEur: typeof parsed.socialBonusCostEur === "number" ? parsed.socialBonusCostEur : null,
    financingSocialBonusAmount:
      typeof parsed.financingSocialBonusAmount === "number" ? parsed.financingSocialBonusAmount : null,
    otherCosts: typeof parsed.otherCosts === "number" ? parsed.otherCosts : null,
    totalAmountEur: typeof parsed.totalAmountEur === "number" ? parsed.totalAmountEur : null,
    electricityTaxRegime: parsed.electricityTaxRegime ?? null,
    invoiceDate: parsed.invoiceDate ?? null,
    holderNif: parsed.holderNif ?? null,
    iban: parsed.iban ?? null,
  }
}

Deno.serve(async (request: Request) => {
  const optionsResponse = handleOptions(request)
  if (optionsResponse) return optionsResponse

  if (request.method !== "POST") {
    return errorResponse(405, "Metodo no permitido", request)
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) {
    return errorResponse(500, "OPENAI_API_KEY no configurada", request)
  }

  // verify_jwt=false (ver config.toml): esta función la llaman tanto el ERP como la web
  // pública como visitante anónimo, igual que `ai-assistant`. Para no dejarla abierta a
  // cualquiera que descubra la URL (y nos facture tokens de OpenAI), exige una clave
  // compartida de bajo riesgo (no es la API key de OpenAI, solo evita abuso) que SÍ puede
  // vivir en el cliente, análoga al `invoiceAiKey` del servicio de terceros.
  const clientKey = Deno.env.get("INVOICE_AI_OPENAI_CLIENT_KEY")
  if (clientKey) {
    const providedKey = request.headers.get("x-invoice-ai-key")
    if (providedKey !== clientKey) {
      return errorResponse(401, "Clave de cliente no válida", request)
    }
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse(400, "No se pudo leer el formulario", request)
  }

  const files: File[] = []
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && (key === "file" || /^file_\d+$/.test(key))) {
      files.push(value)
    }
  }

  if (files.length === 0) {
    return errorResponse(400, "No se adjunto ningun archivo", request)
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return errorResponse(400, `El archivo ${file.name} supera el tamaño maximo permitido`, request)
    }
  }

  const contentParts: Record<string, unknown>[] = [
    { type: "input_text", text: "Extrae los datos de esta factura segun el esquema." },
  ]
  for (const file of files) {
    const dataUrl = await fileToDataUrl(file)
    contentParts.push(buildFileContentPart(file, dataUrl))
  }

  const openAiRequestBody = {
    model: OPENAI_MODEL,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: contentParts },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "invoice_extraction",
        strict: true,
        schema: RESPONSE_JSON_SCHEMA,
      },
    },
  }

  let openAiResponse: Response
  try {
    openAiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openAiRequestBody),
    })
  } catch (error) {
    return errorResponse(502, `No se pudo contactar con OpenAI: ${(error as Error).message}`, request)
  }

  if (!openAiResponse.ok) {
    const errorBody = await openAiResponse.text().catch(() => "")
    return errorResponse(502, `OpenAI devolvio un error (${openAiResponse.status}): ${errorBody.slice(0, 500)}`, request)
  }

  const openAiJson = await openAiResponse.json().catch(() => null)
  const outputText = extractOutputText(openAiJson)
  if (!outputText) {
    return errorResponse(502, "Respuesta de OpenAI sin contenido de texto", request)
  }

  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(outputText)
  } catch {
    return errorResponse(502, "La respuesta de OpenAI no es JSON valido", request)
  }

  const extracted = normalizeExtractedPayload(parsedPayload)

  return new Response(
    JSON.stringify({
      status: "ok",
      ...extracted,
    }),
    { status: 200, headers: { ...corsHeadersFor(request), "Content-Type": "application/json" } }
  )
})
