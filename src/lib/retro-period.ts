import type { Contract } from "../types/contract"
import { normalizeTipoClienteSegment } from "./contract-segment-rules"
import {
  getCachedRetrocomisionSchedules,
  scheduleCompaniaMatches,
  type RetrocomisionSchedule,
  type RetrocomisionSegmento,
  type RetrocomisionTramo,
} from "./supabase/retrocomision-schedules"

const DEFAULT_RETRO_MESES = 6
const UNLIMITED_RETRO_MESES = 9999

export type { RetrocomisionSchedule } from "./supabase/retrocomision-schedules"

export interface RetrocomisionPorcentajeResult {
  porcentaje: number
  valorFijoEur?: number
  scheduleUsado: RetrocomisionSchedule | null
  estimado?: boolean
}

function normalizeSegmentoInput(
  segmento: "residencial" | "pyme"
): "residencial" | "pyme" {
  return segmento
}

function scheduleSegmentoMatches(
  scheduleSegmento: RetrocomisionSegmento,
  segmento: "residencial" | "pyme"
): boolean {
  return scheduleSegmento === segmento || scheduleSegmento === "ambos"
}

function peajeMatches(
  schedulePeaje: string | null,
  peajeTramo: string | null
): boolean {
  if (!schedulePeaje) return peajeTramo == null || peajeTramo === ""
  return schedulePeaje === peajeTramo
}

export function getPeajeTramo(peaje: string): string {
  const normalized = (peaje || "").trim().toUpperCase()
  if (!normalized) return "2.0TD"
  if (normalized.includes("2.0")) return "2.0TD"
  if (
    normalized.includes("3.0") ||
    normalized.includes("6.0") ||
    normalized.includes("6.1") ||
    normalized.includes("6.2") ||
    normalized.includes("6.3") ||
    normalized.includes("6.4") ||
    normalized.includes("6.5")
  ) {
    return "3.0TD_6.1TD"
  }
  return peaje.trim()
}

function findTramoForMes(
  tramos: RetrocomisionTramo[],
  mesesTranscurridos: number
): RetrocomisionTramo | null {
  return (
    tramos.find(
      (tramo) =>
        mesesTranscurridos >= tramo.desde_mes && mesesTranscurridos < tramo.hasta_mes
    ) ?? null
  )
}

function resolveRetrocomisionSchedule(
  compania: string,
  segmento: "residencial" | "pyme",
  peajeTramo: string | null,
  schedules: RetrocomisionSchedule[]
): RetrocomisionSchedule | null {
  const companySchedules = schedules.filter(
    (schedule) => schedule.activo && scheduleCompaniaMatches(schedule.compania, compania)
  )
  if (companySchedules.length === 0) return null

  const segmentoInput = normalizeSegmentoInput(segmento)
  const candidates: Array<{ schedule: RetrocomisionSchedule; priority: number }> = []

  for (const schedule of companySchedules) {
    if (!scheduleSegmentoMatches(schedule.segmento, segmentoInput)) continue

    const exactSegment = schedule.segmento === segmentoInput
    const exactPeaje = schedule.peajeTramo != null && schedule.peajeTramo === peajeTramo
    const genericPeaje = schedule.peajeTramo == null

    if (exactSegment && exactPeaje) {
      candidates.push({ schedule, priority: 1 })
    } else if (exactSegment && genericPeaje) {
      candidates.push({ schedule, priority: 2 })
    } else if (schedule.segmento === "ambos" && exactPeaje) {
      candidates.push({ schedule, priority: 3 })
    } else if (schedule.segmento === "ambos" && genericPeaje) {
      candidates.push({ schedule, priority: 4 })
    }
  }

  candidates.sort((a, b) => a.priority - b.priority)
  return candidates[0]?.schedule ?? null
}

export function calcularPorcentajeRetrocomision(
  compania: string,
  segmento: "residencial" | "pyme",
  peaje: string,
  mesesTranscurridos: number,
  schedules: RetrocomisionSchedule[]
): RetrocomisionPorcentajeResult {
  const peajeTramo = getPeajeTramo(peaje)
  const scheduleUsado = resolveRetrocomisionSchedule(
    compania,
    segmento,
    peajeTramo,
    schedules
  )

  if (!scheduleUsado) {
    console.warn(
      `[retro-period] Sin schedule de retrocomisión para "${compania}" (${segmento}, ${peajeTramo}); usando 100% estimado.`
    )
    return { porcentaje: 100, scheduleUsado: null, estimado: true }
  }

  if (scheduleUsado.tipoCalculo === "meses_flat") {
    const mesesFlat = scheduleUsado.mesesFlat ?? DEFAULT_RETRO_MESES
    return {
      porcentaje: mesesTranscurridos < mesesFlat ? 100 : 0,
      scheduleUsado,
    }
  }

  const tramo = findTramoForMes(scheduleUsado.tramos, mesesTranscurridos)
  if (!tramo) {
    return { porcentaje: 0, scheduleUsado }
  }

  if (tramo.unidad === "eur_fijo") {
    return {
      porcentaje: 0,
      valorFijoEur: tramo.valor,
      scheduleUsado,
    }
  }

  return {
    porcentaje: tramo.valor,
    scheduleUsado,
  }
}

export function getEffectiveRetroMesesFromSchedule(
  schedule: RetrocomisionSchedule
): number {
  if (schedule.tipoCalculo === "meses_flat") {
    return schedule.mesesFlat ?? DEFAULT_RETRO_MESES
  }

  if (schedule.tramos.length === 0) return DEFAULT_RETRO_MESES

  const hasPositiveRetro = schedule.tramos.some(
    (tramo) => tramo.unidad === "porcentaje" && tramo.valor > 0
  )
  const unlimited = schedule.tramos.some(
    (tramo) => tramo.hasta_mes >= UNLIMITED_RETRO_MESES && tramo.valor > 0
  )
  if (unlimited && hasPositiveRetro) return UNLIMITED_RETRO_MESES

  const lastPositiveEnd = schedule.tramos
    .filter((tramo) => tramo.valor > 0)
    .reduce((max, tramo) => Math.max(max, tramo.hasta_mes), 0)

  return lastPositiveEnd > 0 ? lastPositiveEnd : DEFAULT_RETRO_MESES
}

function contractSegmento(contract: Contract): "residencial" | "pyme" {
  const segment = normalizeTipoClienteSegment({
    tipoCliente: contract.tipoCliente,
    compania: contract.compania,
    clientName: contract.clientName,
    nif: contract.nif,
  })
  return segment === "pyme" ? "pyme" : "residencial"
}

function contractPeajeTramo(contract: Contract): string {
  return getPeajeTramo(contract.atr ?? contract.tarifa ?? "")
}

function resolveSchedulesForCompania(
  compania: string,
  schedules: RetrocomisionSchedule[]
): RetrocomisionSchedule[] {
  return schedules.filter(
    (schedule) => schedule.activo && scheduleCompaniaMatches(schedule.compania, compania)
  )
}

export function getRetroMonths(compania: string): { meses: number; estimado: boolean } {
  const schedules = getCachedRetrocomisionSchedules()
  const companySchedules = resolveSchedulesForCompania(compania, schedules)
  if (companySchedules.length === 0) {
    return { meses: DEFAULT_RETRO_MESES, estimado: true }
  }

  const meses = companySchedules.reduce(
    (max, schedule) => Math.max(max, getEffectiveRetroMesesFromSchedule(schedule)),
    0
  )

  return { meses: meses || DEFAULT_RETRO_MESES, estimado: false }
}

function resolveContractRetroMeses(contract: Contract): { meses: number; estimado: boolean } {
  const schedules = getCachedRetrocomisionSchedules()
  const schedule = resolveRetrocomisionSchedule(
    contract.compania,
    contractSegmento(contract),
    contractPeajeTramo(contract),
    schedules
  )

  if (!schedule) {
    return getRetroMonths(contract.compania)
  }

  return {
    meses: getEffectiveRetroMesesFromSchedule(schedule),
    estimado: false,
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function contractStartDate(contract: Contract): Date {
  const raw = contract.estadoEfectivoDesde ?? contract.createdAt
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function getFechaFinRetro(contract: Contract): Date {
  const { meses } = resolveContractRetroMeses(contract)
  return addMonths(contractStartDate(contract), meses)
}

export function getDiasRestantesRetro(
  contract: Contract,
  referenceDate: Date = new Date()
): number {
  const fin = getFechaFinRetro(contract)
  const diffMs = fin.getTime() - referenceDate.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function isRetroElegibleParaRecomendacion(
  contract: Contract,
  referenceDate: Date = new Date()
): boolean {
  return getDiasRestantesRetro(contract, referenceDate) <= 30
}

export function getMesesTranscurridosRetro(
  contract: Contract,
  referenceDate: Date = new Date()
): number {
  const start = contractStartDate(contract)
  const months =
    (referenceDate.getFullYear() - start.getFullYear()) * 12 +
    (referenceDate.getMonth() - start.getMonth())
  return Math.max(0, months)
}
