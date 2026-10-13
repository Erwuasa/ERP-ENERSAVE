import { normalizeCompaniaKey } from "@/lib/erp/compania-logos"
import {
  inferErpAudienceFromPeaje,
  inferMarcoSegmentoFromText,
} from "@/lib/infer-erp-segment"
import { normalizeMarcoTarifaName } from "@/lib/marco-dedup"
import { parseConsumoTramoRange, type MarcoConsumoTramo } from "@/lib/marco-consumo-tramo"
import type { MarcoComisionUnidad, MarcoSegmento } from "@/lib/supabase/marco-retributivo"

export interface MarcoTariffOffer {
  id: string
  compania: string
  companiaLogoUrl: string | null
  tarifa: string
  peaje: string
  tipo: "luz" | "gas"
  segmento: MarcoSegmento
  energia: Array<number | null>
  potencia: Array<number | null>
}

export interface MarcoCommissionSlice {
  compania: string
  campania: string
  peaje: string
  tramo: string
  desdeKwh: number
  hastaKwh: number
  comision: number
  unidad: MarcoComisionUnidad
  condicion: string
}

export interface WovenMarcoTariff {
  id: string
  compania: string
  companiaLogoUrl: string | null
  tarifa: string
  peaje: string
  tipo: "luz" | "gas"
  segmento: MarcoSegmento
  energia: Array<number | null>
  potencia: Array<number | null>
  tramos: MarcoConsumoTramo[]
  hasCommission: boolean
}

const TIER_NOISE = new Set(["luz", "gas", "tarifa", "fija", "fijo", "plan", "energy", "energia"])
const COMPANY_TAILS = ["pymes", "residencial", "empresa", "hogar"]

function companyKey(name: string): string {
  return normalizeCompaniaKey(name).replace(/energia|energy/g, "")
}

function peajeKey(peaje: string): string {
  return peaje.trim().toLowerCase()
}

/**
 * Misma campaña aunque el precio lleve un código de año (`20269`) o guiones bajos
 * (`T1_INTEGRAL_24H_20269` y `T1_INTEGRAL_24H`).
 */
export function marcoCommissionNameKey(name: string): string {
  const stripped = name
    .trim()
    .replace(/^\++\s*/, "")
    .replace(/\([^)]*\)/g, " ")
  return normalizeMarcoTarifaName(stripped)
    .replace(/_/g, " ")
    .replace(/\b20\d{3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Palabras de la tarifa que pueden ser el nombre entero de una comisión más corta. */
export function marcoCommissionExtraLookups(name: string): string[] {
  return marcoCommissionNameKey(name)
    .split(" ")
    .filter((token) => isCommissionCode(token) || (token.length >= 6 && !TIER_NOISE.has(token)))
}

/** Nombres con los que buscar la comisión de una tarifa: el suyo y, si cambia, el de sin año. */
export function marcoCommissionLookupNames(name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return []
  const withoutYear = trimmed
    .replace(/[_\s]+20\d{3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return [...new Set([trimmed, withoutYear].filter((value) => value.length >= 3))]
}

function isTierToken(campania: string): boolean {
  const token = normalizeMarcoTarifaName(campania)
  if (!token || token.includes(" ")) return false
  if (token.length < 3) return false
  if (TIER_NOISE.has(token)) return false
  return true
}

function companyLookupKeys(name: string): string[] {
  const key = companyKey(name)
  if (!key) return [""]
  const keys = [key, ""]
  for (const tail of COMPANY_TAILS) {
    if (key.endsWith(tail) && key.length > tail.length) keys.push(key.slice(0, -tail.length))
  }
  return keys
}

function companiesMatch(commissionCompany: string, tariffCompany: string): boolean {
  if (!commissionCompany.trim()) return true
  const left = companyKey(commissionCompany)
  const right = companyKey(tariffCompany)
  if (!left || !right) return false
  if (left === right) return true
  return right.startsWith(left) && COMPANY_TAILS.includes(right.slice(left.length))
}

function isCommissionCode(name: string): boolean {
  const key = marcoCommissionNameKey(name)
  if (!/^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/.test(key)) return false
  return key.length >= 2 && key.length <= 8
}

function sliceIdentity(slice: MarcoCommissionSlice): string {
  return [
    slice.tramo.trim().toLowerCase(),
    slice.comision,
    slice.unidad,
    slice.desdeKwh,
    slice.hastaKwh,
  ].join("|")
}

function dedupeSlices(slices: MarcoCommissionSlice[]): MarcoCommissionSlice[] {
  const seen = new Set<string>()
  const out: MarcoCommissionSlice[] = []
  for (const slice of slices) {
    const key = sliceIdentity(slice)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(slice)
  }
  return out
}

function readAmount(value: unknown): number | null {
  if (value == null || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function isFeeTipo(tipo: string): boolean {
  return tipo === "fee_energia" || tipo === "fee_potencia"
}

/** «1,25 % fee energía» → 1.25. El euro de estas filas llega null a propósito. */
function readFeePercent(value: unknown): number | null {
  if (typeof value !== "string") return null
  const match = value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*%/)
  if (!match?.[1]) return null
  const num = Number(match[1].replace(",", "."))
  return Number.isFinite(num) ? num : null
}

function amountFromPayload(payload: Record<string, unknown>, tipo: string): number | null {
  if (isFeeTipo(tipo)) return readFeePercent(payload.importe_comercial)
  const eur = readAmount(payload.comision_eur)
  const porMw = readAmount(payload.comision_por_mw)
  if (tipo === "fijo_kwh" && eur != null) return eur * 1000
  if (tipo === "fijo_mwh" && porMw != null) return porMw
  if (eur != null) return eur
  return porMw
}

function unidadFromTipo(tipo: string): MarcoComisionUnidad {
  if (tipo === "fijo_mwh" || tipo === "fijo_kwh") return "eur_mwh"
  if (tipo === "fee_energia") return "porcentaje_consumo"
  if (tipo === "fee_potencia") return "porcentaje_termino"
  return "eur_cups"
}

export function marcoComisionTipoForUnidad(
  unidad: MarcoComisionUnidad | null | undefined
): "fija" | "porcentaje" {
  if (
    unidad === "porcentaje_facturado" ||
    unidad === "porcentaje_consumo" ||
    unidad === "porcentaje_termino"
  ) {
    return "porcentaje"
  }
  return "fija"
}

/** Una fila de `enertech_comisiones` → tramo de comisión, o null si no hay campaña. */
export function commissionSliceFromPayload(input: {
  compania: string
  payload: Record<string, unknown> | null
}): MarcoCommissionSlice | null {
  const payload = input.payload ?? {}
  const campania = String(payload.campania ?? "").trim()
  if (!campania) return null

  const tipo = String(payload.tipo_comision ?? "fijo_contrato")
  const comision = amountFromPayload(payload, tipo)
  if (comision == null) return null
  const tramo = String(payload.tramo ?? "").trim()
  const range = tramo ? parseConsumoTramoRange(tramo) : null
  const open = !tramo || !range
  const condicion = tramo || "Por contrato"

  return {
    compania: input.compania.trim(),
    campania,
    peaje: String(payload.tarifa ?? "").trim(),
    tramo,
    desdeKwh: open ? Number.NaN : range.desde,
    hastaKwh: open ? Number.NaN : range.hasta,
    comision,
    unidad: unidadFromTipo(tipo),
    condicion,
  }
}

export function marcoOfferSegment(compania: string, tarifa: string, peaje: string): MarcoSegmento {
  return (
    inferMarcoSegmentoFromText(`${compania} ${tarifa}`) ??
    inferErpAudienceFromPeaje(peaje) ??
    "residencial"
  )
}

export function marcoOfferTipo(tarifa: string, peaje: string): "luz" | "gas" {
  if (/gas/i.test(tarifa) || /gas/i.test(peaje) || /rl\d/i.test(peaje)) return "gas"
  return "luz"
}

function toConsumoTramo(slice: MarcoCommissionSlice): MarcoConsumoTramo {
  return {
    desde_kwh: slice.desdeKwh,
    hasta_kwh: slice.hastaKwh,
    comision_base: slice.comision,
    unidad: slice.unidad,
    condicion: slice.condicion,
  }
}

function sortTramos(tramos: MarcoConsumoTramo[]): MarcoConsumoTramo[] {
  return [...tramos].sort((a, b) => {
    const aOk = Number.isFinite(a.desde_kwh)
    const bOk = Number.isFinite(b.desde_kwh)
    if (aOk !== bOk) return aOk ? -1 : 1
    return a.desde_kwh - b.desde_kwh
  })
}

/**
 * Cruza cada tarifa del catálogo de precios con los tramos de `enertech_comisiones`.
 * Una tarifa sale una vez; los tramos distintos viajan en `tramos` para que la tabla
 * los pinte como filas separadas. La compañía y el nombre son los de la tarifa.
 */
export function weaveMarcoTariffsWithCommissions(
  offers: MarcoTariffOffer[],
  slices: MarcoCommissionSlice[]
): WovenMarcoTariff[] {
  const exact = new Map<string, MarcoCommissionSlice[]>()
  const tiers = new Map<string, Map<string, MarcoCommissionSlice[]>>()
  const byCompanyPeaje = new Map<string, MarcoCommissionSlice[]>()

  function push(map: Map<string, MarcoCommissionSlice[]>, key: string, slice: MarcoCommissionSlice) {
    const list = map.get(key) ?? []
    list.push(slice)
    map.set(key, list)
  }

  for (const slice of slices) {
    const name = marcoCommissionNameKey(slice.campania)
    const peaje = peajeKey(slice.peaje)
    const company = slice.compania.trim() ? companyKey(slice.compania) : ""
    push(exact, `${name}|${peaje}|${company}`, slice)
    push(byCompanyPeaje, `${company}|${peaje}`, slice)

    if (company && !peaje && isTierToken(slice.campania)) {
      const token = normalizeMarcoTarifaName(slice.campania)
      const bucket = tiers.get(company) ?? new Map<string, MarcoCommissionSlice[]>()
      const list = bucket.get(token) ?? []
      list.push(slice)
      bucket.set(token, list)
      tiers.set(company, bucket)
    }
  }

  const tariffNames = new Set(offers.map((offer) => normalizeMarcoTarifaName(offer.tarifa)))
  const offerNameKeys = new Set(offers.map((offer) => marcoCommissionNameKey(offer.tarifa)))

  function slicesFor(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    return companyLookupKeys(offer.compania).flatMap((company) => [
      ...(byCompanyPeaje.get(`${company}|${peaje}`) ?? []),
      ...(peaje ? (byCompanyPeaje.get(`${company}|`) ?? []) : []),
    ])
  }

  function exactSlices(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    const name = marcoCommissionNameKey(offer.tarifa)
    return companyLookupKeys(offer.compania).flatMap(
      (company) => exact.get(`${name}|${peaje}|${company}`) ?? []
    )
  }

  function prefixSlices(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    const name = normalizeMarcoTarifaName(offer.tarifa)
    const pool = companyLookupKeys(offer.compania).flatMap(
      (company) => byCompanyPeaje.get(`${company}|${peaje}`) ?? []
    )
    return pool.filter((slice) => {
      if (!companiesMatch(slice.compania, offer.compania)) return false
      const commissionName = normalizeMarcoTarifaName(slice.campania)
      if (!commissionName.startsWith(`${name} `)) return false
      if (tariffNames.has(commissionName)) return false
      const extra = commissionName.slice(name.length + 1).split(" ").filter(Boolean)
      return extra.length > 0 && extra.length <= 2
    })
  }

  function codeSlices(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    const tokens = new Set(marcoCommissionNameKey(offer.tarifa).split(" ").filter(Boolean))
    return slicesFor(offer, peaje).filter((slice) => {
      if (!companiesMatch(slice.compania, offer.compania)) return false
      const code = marcoCommissionNameKey(slice.campania)
      if (!isCommissionCode(code)) return false
      if (offerNameKeys.has(code)) return false
      return tokens.has(code)
    })
  }

  function extendsSlices(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    const name = marcoCommissionNameKey(offer.tarifa)
    return slicesFor(offer, peaje).filter((slice) => {
      if (!companiesMatch(slice.compania, offer.compania)) return false
      const commissionName = marcoCommissionNameKey(slice.campania)
      if (!commissionName || !name.startsWith(`${commissionName} `)) return false
      if (offerNameKeys.has(commissionName)) return false
      const extra = name.slice(commissionName.length + 1).split(" ").filter(Boolean)
      return extra.length > 0 && extra.length <= 4
    })
  }

  function wordSlices(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    const tokens = new Set(
      marcoCommissionNameKey(offer.tarifa)
        .split(" ")
        .filter((token) => token.length >= 5 && !TIER_NOISE.has(token))
    )
    return slicesFor(offer, peaje).filter((slice) => {
      if (!companiesMatch(slice.compania, offer.compania)) return false
      const commissionName = marcoCommissionNameKey(slice.campania)
      if (!commissionName || commissionName.includes(" ")) return false
      if (commissionName.length < 5 || TIER_NOISE.has(commissionName)) return false
      if (offerNameKeys.has(commissionName)) return false
      return tokens.has(commissionName)
    })
  }

  function tierSlices(offer: MarcoTariffOffer): MarcoCommissionSlice[] {
    const bucket = new Map<string, MarcoCommissionSlice[]>()
    for (const company of companyLookupKeys(offer.compania)) {
      const found = tiers.get(company)
      if (!found) continue
      for (const [token, list] of found) {
        const current = bucket.get(token) ?? []
        current.push(...list)
        bucket.set(token, current)
      }
    }
    if (bucket.size === 0) return []
    const name = normalizeMarcoTarifaName(offer.tarifa)
    const tokens = [...bucket.keys()]
    const matched = tokens.find((token) => token !== "base" && name.endsWith(` ${token}`))
    if (matched) return bucket.get(matched) ?? []
    const endsWithOtherTier = tokens.some((token) => token !== "base" && name.endsWith(` ${token}`))
    if (!endsWithOtherTier && bucket.has("base")) return bucket.get("base") ?? []
    return []
  }

  return offers.map((offer) => {
    const peaje = peajeKey(offer.peaje)
    const specific = dedupeSlices(exactSlices(offer, peaje))
    const generic = dedupeSlices(exactSlices(offer, ""))
    const prefixed = dedupeSlices(prefixSlices(offer, peaje))
    const extended = dedupeSlices(extendsSlices(offer, peaje))
    const coded = dedupeSlices(codeSlices(offer, peaje))
    const worded = dedupeSlices(wordSlices(offer, peaje))
    const tier = dedupeSlices(tierSlices(offer))
    const chosen = specific.length
      ? specific
      : generic.length
        ? generic
        : prefixed.length
          ? prefixed
          : extended.length
            ? extended
            : coded.length
              ? coded
              : worded.length
                ? worded
                : tier

    const tramos = sortTramos(chosen.map(toConsumoTramo))
    return {
      id: offer.id,
      compania: offer.compania,
      companiaLogoUrl: offer.companiaLogoUrl,
      tarifa: offer.tarifa,
      peaje: offer.peaje,
      tipo: offer.tipo,
      segmento: offer.segmento,
      energia: offer.energia,
      potencia: offer.potencia,
      tramos,
      hasCommission: tramos.length > 0,
    }
  })
}
