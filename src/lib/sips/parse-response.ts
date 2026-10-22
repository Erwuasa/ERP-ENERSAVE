import type { SipsErrorCode, SipsMonthConsumption, SipsOutcome, SipsResumen } from "./types"

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

const ANNUAL_CONSUMPTION_KEYS = [
  "consumos_kwh",
  "consumo_kwh",
  "consumos_por_periodo",
  "consumo_por_periodo",
  "kwh_por_periodo",
  "energia_kwh",
] as const

const MONTHLY_CONSUMPTION_KEYS = ["consumo_mensual", "consumos_mensuales", "curva_mensual", "meses"] as const

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const

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

function periodFromKey(key: string): string | null {
  const match = key.toUpperCase().match(/P([1-6])/)
  return match ? `P${match[1]}` : null
}

function kwhFromRaw(key: string, raw: unknown): number | null {
  const value = asNumber(raw)
  if (value === null || value <= 0) return null
  const normalized = key.toLowerCase()
  if (normalized.includes("wh") && !normalized.includes("kwh")) return value / 1000
  return value
}

function parsePeriodKwh(value: unknown): Record<string, number> {
  if (Array.isArray(value)) {
    const result: Record<string, number> = {}
    for (const item of value) {
      if (!isRecord(item)) continue
      const period = periodFromKey(asText(item.periodo) ?? asText(item.period) ?? asText(item.nombre) ?? "")
      const kwh = kwhFromRaw("kwh", item.kwh ?? item.consumo ?? item.valor)
      if (period && kwh !== null) result[period] = kwh
    }
    return result
  }
  if (!isRecord(value)) return {}
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    const period = periodFromKey(key)
    const kwh = kwhFromRaw(key, raw)
    if (period && kwh !== null) result[period] = kwh
  }
  return result
}

function parseFlatConsumosKwh(raw: JsonRecord): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!/^(consumo|kwh)_p[1-6](_kwh)?$/i.test(key) && !/^p[1-6]_kwh$/i.test(key)) continue
    const period = periodFromKey(key)
    const kwh = kwhFromRaw(key, value)
    if (period && kwh !== null) result[period] = kwh
  }
  return result
}

function parseConsumosKwh(raw: JsonRecord): Record<string, number> {
  for (const key of ANNUAL_CONSUMPTION_KEYS) {
    const parsed = parsePeriodKwh(raw[key])
    if (Object.keys(parsed).length > 0) return parsed
  }
  return parseFlatConsumosKwh(raw)
}

function monthSortKey(value: string): string | null {
  const iso = value.match(/(\d{4})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}`
  const slash = value.match(/(\d{1,2})[/.-](\d{4})/)
  if (slash) return `${slash[2]}-${slash[1].padStart(2, "0")}`
  return null
}

function monthLabel(sortKey: string | null, fallback: string): string {
  if (!sortKey) return fallback
  const [year, month] = sortKey.split("-")
  const index = Number(month) - 1
  if (!year || index < 0 || index > 11) return fallback
  return `${MONTH_LABELS[index]} ${year.slice(2)}`
}

function energyPeriodKwh(record: JsonRecord): Record<string, number> {
  const nested = parsePeriodKwh(record.consumos_kwh ?? record.consumos ?? record.by_period)
  if (Object.keys(nested).length > 0) return nested
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(record)) {
    const compact = key.replace(/[^a-z0-9]/gi, "")
    const isEnergy =
      /^p[1-6]$/i.test(key) ||
      /kwh/i.test(key) ||
      /consumoenergiaactiva/i.test(compact) ||
      /^consumo_p[1-6]/i.test(key)
    if (!isEnergy) continue
    const period = periodFromKey(key)
    const kwh = kwhFromRaw(key, raw)
    if (period && kwh !== null) result[period] = kwh
  }
  return result
}

function parseMonthRow(value: unknown, keyHint: string | null): SipsMonthConsumption | null {
  if (!isRecord(value)) return null
  const dateText =
    asText(value.fecha) ??
    asText(value.mes) ??
    asText(value.fecha_fin) ??
    asText(value.fechaFinMesConsumo) ??
    asText(value.fecha_fin_mes_consumo) ??
    keyHint
  const sortKey = dateText ? monthSortKey(dateText) : null
  const explicitLabel = asText(value.label) ?? asText(value.etiqueta)
  const label = explicitLabel ?? (dateText ? monthLabel(sortKey, dateText) : null)
  if (!label) return null
  const byPeriod = energyPeriodKwh(value)
  if (Object.keys(byPeriod).length === 0) return null
  return { label, sortKey, byPeriod }
}

function parseConsumoMensual(raw: JsonRecord): SipsMonthConsumption[] {
  for (const key of MONTHLY_CONSUMPTION_KEYS) {
    const value = raw[key]
    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        const row = parseMonthRow(item, null)
        return row ? [row] : []
      })
    }
    if (isRecord(value)) {
      return Object.entries(value).flatMap(([monthKey, item]) => {
        const row = isRecord(item) ? parseMonthRow({ ...item, mes: asText(item.mes) ?? monthKey }, monthKey) : null
        return row ? [row] : []
      })
    }
  }
  return []
}

export function parseSipsResumen(value: unknown): SipsResumen {
  const raw = isRecord(value) ? value : {}
  return {
    cups: asText(raw.cups),
    tarifa: asText(raw.tarifa),
    potenciasKw: parsePotencias(raw.potencias_kw),
    consumoAnualKwh: asNumber(raw.consumo_anual_kwh),
    consumosKwh: parseConsumosKwh(raw),
    consumoMensual: parseConsumoMensual(raw),
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
