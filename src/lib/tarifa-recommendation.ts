import type { Contract } from "../types/contract"
import { resolveContractTipoCliente } from "./contract-registration"
import { normalizeContractEstado } from "./contract-estado"
import {
  marcoHasSva,
  marcoRowHasCompletePrices,
} from "./marco-retributivo-display"
import { inferIncluyeSvaFromMarcoText } from "./marco-comparador-meta"
import { estimateMarcoCommissionEur } from "./marco-commission"
import {
  isMarcoEntryForSegment,
  tipoClienteToSegment,
  type ContractWizardSegment,
} from "./contract-tariff-filter"
import { marcoRowToProducto } from "./productos-catalog"
import {
  calcularCosteAnualDesdeMarco,
  contractPeaje,
  normalizePeaje,
} from "./tarifa-cost-calculator"
import { getRetroMonths, isRetroElegibleParaRecomendacion } from "./retro-period"
import {
  marcoRowToCatalogEntry,
  type MarcoRetributivoRow,
  type MarcoSegmento,
} from "./supabase/marco-retributivo"

export interface TarifaRecommendation {
  contractId: string
  cupsCode: string
  companiaActual: string
  tarifaActual: string
  companiaRecomendada: string
  tarifaRecomendadaId: string
  tarifaRecomendadaNombre: string
  costeActualAnual: number
  costeNuevoAnual: number
  ahorroAnualEur: number
  ahorroPct: number
  comisionActualEur: number
  comisionNuevaEur: number
  comisionMejoraEur: number
  mesesRetroNueva: number
  retroPeriodoEstimado: boolean
  score: number
  calculadoEn: string
  costeActualEstimado?: boolean
}

interface ScoredCandidate extends TarifaRecommendation {
  ahorroPctNorm: number
  comisionMejoraNorm: number
  retroMesesNorm: number
}

function normalizeCompania(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function isSameCompania(a: string, b: string): boolean {
  const na = normalizeCompania(a)
  const nb = normalizeCompania(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

function contractTipoClienteToMarcoSegmento(
  tipoCliente: ReturnType<typeof resolveContractTipoCliente>
): MarcoSegmento {
  if (tipoCliente === "pyme") return "pyme"
  if (tipoCliente === "autonomo") return "autonomo"
  if (tipoCliente === "comunidad_vecinos") return "comunidades"
  return "residencial"
}

export function contractToMarcoSegmento(contract: Contract): MarcoSegmento {
  return contractTipoClienteToMarcoSegmento(resolveContractTipoCliente(contract))
}

function contractWizardSegment(contract: Contract): ContractWizardSegment {
  return tipoClienteToSegment(resolveContractTipoCliente(contract))
}

function companiaOffersSegmento(
  compania: string,
  segmento: MarcoSegmento,
  tipo: MarcoRetributivoRow["tipo"],
  marcoEntries: MarcoRetributivoRow[]
): boolean {
  return marcoEntries.some(
    (entry) =>
      entry.activo &&
      entry.tipo === tipo &&
      isSameCompania(entry.compania, compania) &&
      entry.segmento === segmento
  )
}

function contractHasSva(
  contract: Contract,
  currentEntry: MarcoRetributivoRow | null
): boolean {
  if (currentEntry) return marcoHasSva(currentEntry)
  return inferIncluyeSvaFromMarcoText(contract.tarifa, "")
}

function findCurrentMarcoEntry(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[]
): MarcoRetributivoRow | null {
  const segmento = contractToMarcoSegmento(contract)
  const peaje = normalizePeaje(contractPeaje(contract))

  if (contract.marcoEntryId) {
    const byId = marcoEntries.find((e) => e.id === contract.marcoEntryId)
    if (byId && byId.segmento === segmento) return byId
  }

  return (
    marcoEntries.find(
      (e) =>
        e.tipo === contract.tipo &&
        isSameCompania(e.compania, contract.compania) &&
        e.tarifa === contract.tarifa &&
        normalizePeaje(e.peaje) === peaje &&
        e.segmento === segmento
    ) ??
    marcoEntries.find(
      (e) =>
        e.tipo === contract.tipo &&
        isSameCompania(e.compania, contract.compania) &&
        normalizePeaje(e.peaje) === peaje &&
        e.segmento === segmento
    ) ??
    null
  )
}

export function marcoEntryMatchesContractCliente(
  entry: MarcoRetributivoRow,
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[]
): boolean {
  const contractTipo = resolveContractTipoCliente(contract)
  const contractSegmento = contractToMarcoSegmento(contract)
  const product = marcoRowToProducto(entry)

  if (product.tipoCliente !== contractTipo) return false
  if (entry.segmento !== contractSegmento) return false

  const catalogEntry = marcoRowToCatalogEntry(entry)
  if (!isMarcoEntryForSegment(catalogEntry, contractWizardSegment(contract))) return false

  if (
    !companiaOffersSegmento(entry.compania, contractSegmento, contract.tipo, marcoEntries)
  ) {
    return false
  }

  return true
}

export function filterRecommendationCandidates(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[]
): MarcoRetributivoRow[] {
  const peaje = normalizePeaje(contractPeaje(contract))
  const currentEntry = findCurrentMarcoEntry(contract, marcoEntries)
  const currentHasSva = contractHasSva(contract, currentEntry)

  return marcoEntries.filter((entry) => {
    if (!entry.activo) return false
    if (entry.tipo !== contract.tipo) return false
    if (normalizePeaje(entry.peaje) !== peaje) return false
    if (isSameCompania(entry.compania, contract.compania)) return false
    if (!marcoEntryMatchesContractCliente(entry, contract, marcoEntries)) return false
    if (marcoHasSva(entry) !== currentHasSva) return false
    if (!marcoRowHasCompletePrices(entry)) return false
    return true
  })
}

function minMaxNormalize(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return (value - min) / (max - min)
}

function buildRecommendationBase(
  contract: Contract,
  entry: MarcoRetributivoRow,
  costeActualAnual: number,
  costeNuevoAnual: number,
  comisionActualEur: number,
  comisionNuevaEur: number
): Omit<TarifaRecommendation, "score" | "calculadoEn"> {
  const ahorroAnualEur = costeActualAnual - costeNuevoAnual
  const ahorroPct =
    costeActualAnual > 0 ? (ahorroAnualEur / costeActualAnual) * 100 : 0
  const retro = getRetroMonths(entry.compania)
  const comisionMejoraEur = comisionNuevaEur - comisionActualEur

  return {
    contractId: contract.id,
    cupsCode: contract.cups,
    companiaActual: contract.compania,
    tarifaActual: contract.tarifa,
    companiaRecomendada: entry.compania,
    tarifaRecomendadaId: entry.id,
    tarifaRecomendadaNombre: entry.tarifa,
    costeActualAnual: Math.round(costeActualAnual * 100) / 100,
    costeNuevoAnual: Math.round(costeNuevoAnual * 100) / 100,
    ahorroAnualEur: Math.round(ahorroAnualEur * 100) / 100,
    ahorroPct: Math.round(ahorroPct * 10) / 10,
    comisionActualEur: Math.round(comisionActualEur * 100) / 100,
    comisionNuevaEur: Math.round(comisionNuevaEur * 100) / 100,
    comisionMejoraEur: Math.round(comisionMejoraEur * 100) / 100,
    mesesRetroNueva: retro.meses,
    retroPeriodoEstimado: retro.estimado,
    costeActualEstimado: false,
  }
}

function scoreCandidates(
  candidates: Omit<TarifaRecommendation, "score" | "calculadoEn">[]
): ScoredCandidate[] {
  if (candidates.length === 0) return []

  const ahorroPcts = candidates.map((c) => c.ahorroPct)
  const comisionMejoras = candidates.map((c) => c.comisionMejoraEur)
  const retroMeses = candidates.map((c) => c.mesesRetroNueva)

  const minAhorro = Math.min(...ahorroPcts)
  const maxAhorro = Math.max(...ahorroPcts)
  const minCom = Math.min(...comisionMejoras)
  const maxCom = Math.max(...comisionMejoras)
  const minRetro = Math.min(...retroMeses)
  const maxRetro = Math.max(...retroMeses)

  return candidates
    .map((c) => {
      const ahorroPctNorm = minMaxNormalize(c.ahorroPct, minAhorro, maxAhorro)
      const comisionMejoraNorm = minMaxNormalize(c.comisionMejoraEur, minCom, maxCom)
      const retroMesesNorm = minMaxNormalize(c.mesesRetroNueva, minRetro, maxRetro)
      const score =
        0.45 * ahorroPctNorm + 0.45 * comisionMejoraNorm - 0.1 * retroMesesNorm

      return {
        ...c,
        ahorroPctNorm,
        comisionMejoraNorm,
        retroMesesNorm,
        score: Math.round(score * 1000) / 1000,
        calculadoEn: new Date().toISOString(),
      }
    })
    .sort((a, b) => b.score - a.score)
}

function estimateCommissionForEntry(
  entry: MarcoRetributivoRow | null,
  contract: Contract,
  comercialCommissionPct: number,
  formatCurrency: (val: number) => string
): number {
  if (!entry) return 0
  const catalogEntry = marcoRowToCatalogEntry(entry)
  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
  return estimateMarcoCommissionEur(
    catalogEntry,
    comercialCommissionPct,
    consumo,
    formatCurrency
  ).amountEur
}

function collectViableRecommendations(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[],
  comercialCommissionPct: number,
  formatCurrency: (val: number) => string
): Omit<TarifaRecommendation, "score" | "calculadoEn">[] {
  const currentEntry = findCurrentMarcoEntry(contract, marcoEntries)
  if (!currentEntry || !marcoRowHasCompletePrices(currentEntry)) return []

  const candidates = filterRecommendationCandidates(contract, marcoEntries)
  if (candidates.length === 0) return []

  const costeActualAnual = calcularCosteAnualDesdeMarco(currentEntry, contract).totalAnual
  const comisionActualEur = estimateCommissionForEntry(
    currentEntry,
    contract,
    comercialCommissionPct,
    formatCurrency
  )

  const viable: Omit<TarifaRecommendation, "score" | "calculadoEn">[] = []

  for (const entry of candidates) {
    const costeNuevoAnual = calcularCosteAnualDesdeMarco(entry, contract).totalAnual
    if (costeNuevoAnual > costeActualAnual) continue

    const comisionNuevaEur = estimateCommissionForEntry(
      entry,
      contract,
      comercialCommissionPct,
      formatCurrency
    )

    if (costeNuevoAnual === costeActualAnual && comisionNuevaEur <= comisionActualEur) {
      continue
    }

    viable.push(
      buildRecommendationBase(
        contract,
        entry,
        costeActualAnual,
        costeNuevoAnual,
        comisionActualEur,
        comisionNuevaEur
      )
    )
  }

  return viable
}

export function calcularRecomendacionParaContrato(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[],
  comercialCommissionPct: number,
  formatCurrency: (val: number) => string
): TarifaRecommendation | null {
  if (!isRetroElegibleParaRecomendacion(contract)) return null

  const viable = collectViableRecommendations(
    contract,
    marcoEntries,
    comercialCommissionPct,
    formatCurrency
  )
  if (viable.length === 0) return null

  const scored = scoreCandidates(viable)
  const best = scored[0]
  return {
    ...best,
    calculadoEn: new Date().toISOString(),
  }
}

export function calcularTop2RecomendacionesParaContrato(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[],
  comercialCommissionPct: number,
  formatCurrency: (val: number) => string
): TarifaRecommendation[] {
  if (!isRetroElegibleParaRecomendacion(contract)) return []

  const viable = collectViableRecommendations(
    contract,
    marcoEntries,
    comercialCommissionPct,
    formatCurrency
  )

  const calculadoEn = new Date().toISOString()
  return scoreCandidates(viable)
    .slice(0, 2)
    .map((c) => ({ ...c, calculadoEn }))
}

export interface ComercialCommissionLookup {
  id: string
  commissionPercentage?: number
}

export function calcularRecomendacionesParaContratos(
  contracts: Contract[],
  marcoEntries: MarcoRetributivoRow[],
  comerciales: ComercialCommissionLookup[],
  formatCurrency: (val: number) => string
): Map<string, TarifaRecommendation> {
  const result = new Map<string, TarifaRecommendation>()

  for (const contract of contracts) {
    if (normalizeContractEstado(contract.estado) !== "ACTIVADO") continue
    if (!isRetroElegibleParaRecomendacion(contract)) continue

    const comercial = comerciales.find((c) => c.id === contract.comercialId)
    const pct = comercial?.commissionPercentage ?? 10

    const rec = calcularRecomendacionParaContrato(
      contract,
      marcoEntries,
      pct,
      formatCurrency
    )
    if (rec) result.set(contract.id, rec)
  }

  return result
}
