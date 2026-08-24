import type { Contract } from "../types/contract"
import { normalizeContractEstado } from "./contract-estado"
import { estimateMarcoCommissionEur } from "./marco-commission"
import {
  calcularCosteAnualDesdeMarco,
  calcularCosteAnualFallbackMercado,
  contractPeaje,
  normalizePeaje,
} from "./tarifa-cost-calculator"
import { getRetroMonths, isRetroElegibleParaRecomendacion } from "./retro-period"
import {
  marcoRowToCatalogEntry,
  type MarcoRetributivoRow,
} from "./supabase/marco-retributivo"
import { inferSegmentoFromText } from "./supabase/marco-retributivo"

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
  comisionNuevaEur: number
  mesesRetroNueva: number
  retroPeriodoEstimado: boolean
  score: number
  calculadoEn: string
  costeActualEstimado?: boolean
}

interface ScoredCandidate extends TarifaRecommendation {
  ahorroPctNorm: number
  comisionNorm: number
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

function contractSegmento(contract: Contract): MarcoRetributivoRow["segmento"] {
  if (contract.tipoCliente) {
    const t = contract.tipoCliente.toLowerCase()
    if (t.includes("pyme") || t.includes("empresa")) return "pyme"
    if (t.includes("autonom")) return "autonomo"
    if (t.includes("comunidad")) return "comunidades"
  }
  return inferSegmentoFromText(`${contract.tarifa} ${contract.compania}`)
}

function findCurrentMarcoEntry(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[]
): MarcoRetributivoRow | null {
  if (contract.marcoEntryId) {
    const byId = marcoEntries.find((e) => e.id === contract.marcoEntryId)
    if (byId) return byId
  }
  const peaje = contractPeaje(contract)
  return (
    marcoEntries.find(
      (e) =>
        e.tipo === contract.tipo &&
        isSameCompania(e.compania, contract.compania) &&
        e.tarifa === contract.tarifa &&
        normalizePeaje(e.peaje) === normalizePeaje(peaje)
    ) ??
    marcoEntries.find(
      (e) =>
        e.tipo === contract.tipo &&
        isSameCompania(e.compania, contract.compania) &&
        normalizePeaje(e.peaje) === normalizePeaje(peaje)
    ) ??
    null
  )
}

function computeCurrentAnnualCost(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[]
): { cost: number; estimado: boolean } {
  const currentEntry = findCurrentMarcoEntry(contract, marcoEntries)
  if (currentEntry) {
    return {
      cost: calcularCosteAnualDesdeMarco(currentEntry, contract).totalAnual,
      estimado: false,
    }
  }
  return {
    cost: calcularCosteAnualFallbackMercado(contract).totalAnual,
    estimado: true,
  }
}

function filterCandidates(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[]
): MarcoRetributivoRow[] {
  const peaje = normalizePeaje(contractPeaje(contract))
  const segmento = contractSegmento(contract)

  return marcoEntries.filter((entry) => {
    if (!entry.activo) return false
    if (entry.tipo !== contract.tipo) return false
    if (normalizePeaje(entry.peaje) !== peaje) return false
    if (isSameCompania(entry.compania, contract.compania)) return false
    if (entry.segmento !== segmento && segmento !== "residencial") {
      return entry.segmento === segmento
    }
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
  comisionNuevaEur: number,
  costeActualEstimado: boolean
): Omit<TarifaRecommendation, "score" | "calculadoEn"> {
  const ahorroAnualEur = costeActualAnual - costeNuevoAnual
  const ahorroPct =
    costeActualAnual > 0 ? (ahorroAnualEur / costeActualAnual) * 100 : 0
  const retro = getRetroMonths(entry.compania)

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
    comisionNuevaEur: Math.round(comisionNuevaEur * 100) / 100,
    mesesRetroNueva: retro.meses,
    retroPeriodoEstimado: retro.estimado,
    costeActualEstimado,
  }
}

function scoreCandidates(
  candidates: Omit<TarifaRecommendation, "score" | "calculadoEn">[]
): ScoredCandidate[] {
  if (candidates.length === 0) return []

  const ahorroPcts = candidates.map((c) => c.ahorroPct)
  const comisiones = candidates.map((c) => c.comisionNuevaEur)
  const retroMeses = candidates.map((c) => c.mesesRetroNueva)

  const minAhorro = Math.min(...ahorroPcts)
  const maxAhorro = Math.max(...ahorroPcts)
  const minCom = Math.min(...comisiones)
  const maxCom = Math.max(...comisiones)
  const minRetro = Math.min(...retroMeses)
  const maxRetro = Math.max(...retroMeses)

  return candidates
    .map((c) => {
      const ahorroPctNorm = minMaxNormalize(c.ahorroPct, minAhorro, maxAhorro)
      const comisionNorm = minMaxNormalize(c.comisionNuevaEur, minCom, maxCom)
      const retroMesesNorm = minMaxNormalize(c.mesesRetroNueva, minRetro, maxRetro)
      const score =
        0.45 * ahorroPctNorm + 0.45 * comisionNorm - 0.1 * retroMesesNorm

      return {
        ...c,
        ahorroPctNorm,
        comisionNorm,
        retroMesesNorm,
        score: Math.round(score * 1000) / 1000,
        calculadoEn: new Date().toISOString(),
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function calcularRecomendacionParaContrato(
  contract: Contract,
  marcoEntries: MarcoRetributivoRow[],
  comercialCommissionPct: number,
  formatCurrency: (val: number) => string
): TarifaRecommendation | null {
  if (!isRetroElegibleParaRecomendacion(contract)) return null

  const candidates = filterCandidates(contract, marcoEntries)
  if (candidates.length === 0) return null

  const { cost: costeActualAnual, estimado: costeActualEstimado } =
    computeCurrentAnnualCost(contract, marcoEntries)

  const viable: Omit<TarifaRecommendation, "score" | "calculadoEn">[] = []

  for (const entry of candidates) {
    const costeNuevoAnual = calcularCosteAnualDesdeMarco(entry, contract).totalAnual
    if (costeNuevoAnual > costeActualAnual) continue

    const catalogEntry = marcoRowToCatalogEntry(entry)
    const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
    const comision = estimateMarcoCommissionEur(
      catalogEntry,
      comercialCommissionPct,
      consumo,
      formatCurrency
    )

    viable.push(
      buildRecommendationBase(
        contract,
        entry,
        costeActualAnual,
        costeNuevoAnual,
        comision.amountEur,
        costeActualEstimado
      )
    )
  }

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

  const candidates = filterCandidates(contract, marcoEntries)
  if (candidates.length === 0) return []

  const { cost: costeActualAnual, estimado: costeActualEstimado } =
    computeCurrentAnnualCost(contract, marcoEntries)

  const viable: Omit<TarifaRecommendation, "score" | "calculadoEn">[] = []

  for (const entry of candidates) {
    const costeNuevoAnual = calcularCosteAnualDesdeMarco(entry, contract).totalAnual
    if (costeNuevoAnual > costeActualAnual) continue

    const catalogEntry = marcoRowToCatalogEntry(entry)
    const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
    const comision = estimateMarcoCommissionEur(
      catalogEntry,
      comercialCommissionPct,
      consumo,
      formatCurrency
    )

    viable.push(
      buildRecommendationBase(
        contract,
        entry,
        costeActualAnual,
        costeNuevoAnual,
        comision.amountEur,
        costeActualEstimado
      )
    )
  }

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
