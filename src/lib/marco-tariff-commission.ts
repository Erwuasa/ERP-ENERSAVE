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

function companyKey(name: string): string {
  return normalizeCompaniaKey(name).replace(/energia|energy/g, "")
}

function peajeKey(peaje: string): string {
  return peaje.trim().toLowerCase()
}

function isTierToken(campania: string): boolean {
  const token = normalizeMarcoTarifaName(campania)
  if (!token || token.includes(" ")) return false
  if (token.length < 3) return false
  if (TIER_NOISE.has(token)) return false
  return true
}

function companiesMatch(commissionCompany: string, tariffCompany: string): boolean {
  if (!commissionCompany.trim()) return true
  const left = companyKey(commissionCompany)
  const right = companyKey(tariffCompany)
  if (!left || !right) return false
  return left === right
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

function amountFromPayload(payload: Record<string, unknown>, tipo: string): number {
  const eur = Number(payload.comision_eur)
  const porMw = Number(payload.comision_por_mw)
  if (tipo === "fijo_kwh" && Number.isFinite(eur)) return eur * 1000
  if (tipo === "fijo_mwh" && Number.isFinite(porMw)) return porMw
  if (Number.isFinite(eur)) return eur
  return Number.isFinite(porMw) ? porMw : 0
}

function unidadFromTipo(tipo: string): MarcoComisionUnidad {
  if (tipo === "fijo_mwh" || tipo === "fijo_kwh") return "eur_mwh"
  return "eur_cups"
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
    comision: amountFromPayload(payload, tipo),
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
    const name = normalizeMarcoTarifaName(slice.campania)
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

  function exactSlices(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    const name = normalizeMarcoTarifaName(offer.tarifa)
    const company = companyKey(offer.compania)
    return [
      ...(exact.get(`${name}|${peaje}|${company}`) ?? []),
      ...(exact.get(`${name}|${peaje}|`) ?? []),
    ]
  }

  function prefixSlices(offer: MarcoTariffOffer, peaje: string): MarcoCommissionSlice[] {
    const name = normalizeMarcoTarifaName(offer.tarifa)
    const company = companyKey(offer.compania)
    const pool = [
      ...(byCompanyPeaje.get(`${company}|${peaje}`) ?? []),
      ...(byCompanyPeaje.get(`|${peaje}`) ?? []),
    ]
    return pool.filter((slice) => {
      if (!companiesMatch(slice.compania, offer.compania)) return false
      const commissionName = normalizeMarcoTarifaName(slice.campania)
      if (!commissionName.startsWith(`${name} `)) return false
      if (tariffNames.has(commissionName)) return false
      const extra = commissionName.slice(name.length + 1).split(" ").filter(Boolean)
      return extra.length > 0 && extra.length <= 2
    })
  }

  function tierSlices(offer: MarcoTariffOffer): MarcoCommissionSlice[] {
    const company = companyKey(offer.compania)
    const bucket = tiers.get(company)
    if (!bucket) return []
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
    const tier = dedupeSlices(tierSlices(offer))
    const chosen = specific.length
      ? specific
      : generic.length
        ? generic
        : prefixed.length
          ? prefixed
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
