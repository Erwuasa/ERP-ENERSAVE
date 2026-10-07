import type { SipsErrorCode, SipsOutcome, SipsResumen } from "./types"

const DEFAULT_RETRY_SECONDS = 30

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

/** Accepts numbers and decimal-comma strings ("4,6"); anything else is dropped. */
function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const parsed = Number(value.trim().replace(",", "."))
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : null
}

function parsePotencias(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    const period = key.toUpperCase()
    const kw = asNumber(raw)
    if (/^P[1-6]$/.test(period) && kw !== null && kw > 0) result[period] = kw
  }
  return result
}

export function parseSipsResumen(value: unknown): SipsResumen {
  const raw = isRecord(value) ? value : {}
  return {
    cups: asText(raw.cups),
    tarifa: asText(raw.tarifa),
    potenciasKw: parsePotencias(raw.potencias_kw),
    consumoAnualKwh: asNumber(raw.consumo_anual_kwh),
    codigoPostal: asText(raw.codigo_postal),
    provincia: asText(raw.provincia),
    municipio: asText(raw.municipio),
    distribuidora: asText(raw.distribuidora),
    cnae: asText(raw.cnae),
  }
}

function errorCodeFromStatus(httpStatus: number, apiCode: string | null): SipsErrorCode {
  if (apiCode === "INVALID_CUPS" || httpStatus === 400) return "INVALID_CUPS"
  if (httpStatus === 401 || httpStatus === 403) return "UNAUTHORIZED"
  if (httpStatus === 429) return "RATE_LIMITED"
  if (httpStatus >= 500) return "UPSTREAM"
  return "UNKNOWN"
}

/**
 * Maps the raw HTTP outcome of GET /sips into the three states the screen handles.
 * Only `resumen` is read: `datos` is the provider raw payload and changes with `origen`.
 */
export function parseSipsResponse(
  httpStatus: number,
  body: unknown,
  retryAfterHeader?: string | null
): SipsOutcome {
  const payload = isRecord(body) ? body : {}
  const estado = asText(payload.estado)

  if (httpStatus === 202 || estado === "procesando") {
    const seconds = asNumber(payload.reintentar_en)
    return {
      status: "procesando",
      reintentarEnSegundos: seconds !== null && seconds > 0 ? Math.ceil(seconds) : DEFAULT_RETRY_SECONDS,
    }
  }

  if (httpStatus >= 200 && httpStatus < 300) {
    if (estado === "sin_datos") return { status: "sin_datos", cups: asText(payload.cups) }
    if (estado === "listo" && isRecord(payload.resumen)) {
      const resumen = parseSipsResumen(payload.resumen)
      return {
        status: "listo",
        cups: resumen.cups ?? asText(payload.cups) ?? "",
        resumen,
        origen: asText(payload.origen),
        consultadoEn: asText(payload.consultado_en),
      }
    }
    return { status: "error", code: "UNKNOWN", message: "Respuesta SIPS no reconocida." }
  }

  const apiCode = asText(payload.code)
  const code = errorCodeFromStatus(httpStatus, apiCode)
  const retryAfter = asNumber(retryAfterHeader)
  return {
    status: "error",
    code,
    message: asText(payload.error) ?? "No se pudo consultar SIPS.",
    ...(code === "RATE_LIMITED" && retryAfter !== null ? { retryAfterSeconds: Math.ceil(retryAfter) } : {}),
  }
}
