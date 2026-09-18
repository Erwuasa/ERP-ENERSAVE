import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import {
  formatTramoCondicionMwh,
  parseMarcoTramosJson,
  type MarcoConsumoTramo,
} from "@/lib/marco-consumo-tramo"

function parseNumericToken(raw: string): number | null {
  const trimmed = raw.replace(/\s/g, "")
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function formatMwhValue(value: number): string {
  if (!Number.isFinite(value)) return ""
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2).replace(/\.?0+$/, "").replace(".", ",")
}

export function formatKwhRangeAsMwhLabel(desdeKwh: number, hastaKwh: number): string {
  const desdeMwh = desdeKwh / 1000
  const hastaMwh = hastaKwh >= 999_999_000 ? null : hastaKwh / 1000

  if (hastaMwh == null) {
    return `${formatMwhValue(desdeMwh)}-∞ MWh`
  }
  if (desdeMwh === hastaMwh) {
    return `${formatMwhValue(desdeMwh)} MWh`
  }
  return `${formatMwhValue(desdeMwh)}-${formatMwhValue(hastaMwh)} MWh`
}

export function normalizeTramoCondicionText(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const withoutPrefix = trimmed
    .replace(/^tramo\s*:\s*/i, "")
    .replace(/^camp\s*:\s*/i, "")
    .trim()

  const mwhRange = withoutPrefix.match(
    /(\d+(?:[.,]\d+)?)\s*(?:–|-|a|\.\.\.)\s*(\d+(?:[.,]\d+)?|∞)\s*mwh/i
  )
  if (mwhRange) {
    const desde = parseNumericToken(mwhRange[1]!)
    const hastaRaw = mwhRange[2]!
    if (desde != null) {
      if (hastaRaw.includes("∞")) return `${formatMwhValue(desde)}-∞ MWh`
      const hasta = parseNumericToken(hastaRaw)
      if (hasta != null) return `${formatMwhValue(desde)}-${formatMwhValue(hasta)} MWh`
    }
  }

  const kwhRange = withoutPrefix.match(
    /(\d+(?:[.,\d]+)?)\s*(?:–|-|A|a|\.\.\.)\s*(\d+(?:[.,\d]+)?)\s*kwh/i
  )
  if (kwhRange) {
    const desde = parseNumericToken(kwhRange[1]!)
    const hasta = parseNumericToken(kwhRange[2]!)
    if (desde != null && hasta != null) {
      return formatKwhRangeAsMwhLabel(desde, hasta)
    }
  }

  const singleMwh = withoutPrefix.match(/^(\d+(?:[.,]\d+)?)\s*mwh$/i)
  if (singleMwh) {
    const value = parseNumericToken(singleMwh[1]!)
    if (value != null) return `${formatMwhValue(value)} MWh`
  }

  if (/mwh/i.test(withoutPrefix) && !/^tramo\s*:/i.test(trimmed)) {
    return withoutPrefix.replace(/\s+/g, " ")
  }

  return null
}

function isCampCondicion(text: string): boolean {
  return /^camp\s*:/i.test(text.trim())
}

export function migrateMarcoCondicionesFields(
  condicion_1: string | null | undefined,
  condicion_2: string | null | undefined
): { condicion_1: string; condicion_2: string } {
  let c1 = (condicion_1 ?? "").trim()
  let c2 = (condicion_2 ?? "").trim()

  const tramoFromC1 = normalizeTramoCondicionText(c1)
  const tramoFromC2 = normalizeTramoCondicionText(c2)
  const campFromC1 = isCampCondicion(c1) ? c1 : ""
  const campFromC2 = isCampCondicion(c2) ? c2 : ""

  const tramo = tramoFromC2 ?? tramoFromC1 ?? ""
  const camp = campFromC1 || campFromC2

  c2 = tramo
  c1 = camp

  if (tramoFromC1 && !camp) c1 = ""
  if (!tramo && !isCampCondicion(c2) && c2 && !/^(fuente|fte)\s*:/i.test(c2)) {
    const maybeTramo = normalizeTramoCondicionText(c2)
    c2 = maybeTramo ?? c2
  }

  return { condicion_1: c1, condicion_2: c2 }
}

export function resolveMarcoCondicion2Label(row: MarcoRetributivoRow): string | null {
  const tramos = parseMarcoTramosJson(row.tramos)
  if (tramos.length === 1) {
    const fromTramo = formatTramoCondicionMwh(tramos[0]!)
    if (fromTramo) return fromTramo
  }

  const migrated = migrateMarcoCondicionesFields(row.condicion_1, row.condicion_2)
  const condicion2 = migrated.condicion_2.trim()
  if (condicion2) {
    const normalized = normalizeTramoCondicionText(condicion2)
    if (normalized) return normalized
    if (!/^(fuente|fte|camp)\s*:/i.test(condicion2)) return condicion2
  }

  if (row.at_kwh_min != null || row.at_kwh_max != null) {
    return formatKwhRangeAsMwhLabel(
      row.at_kwh_min ?? 0,
      row.at_kwh_max ?? Number.MAX_SAFE_INTEGER
    )
  }

  return null
}
