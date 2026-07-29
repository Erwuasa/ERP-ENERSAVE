import type { Contract } from "../types/contract"
import type { IncidenciaTicket } from "./incidencias"
import { isIncidenciaAbierta } from "./incidencias"
import {
  isContractActivado,
  normalizeContractEstado,
} from "./contract-estado"
import {
  addMonths,
  getMonthKey,
  isDateInRange,
  last12MonthKeys,
  parseMonthKey,
  toIsoDate,
} from "./date-range"

export interface DashboardFilters {
  comercialId: string | null
  dateFrom: string
  dateTo: string
}

export interface DashboardComercial {
  id: string
  fullName: string
  role: string
  status?: "activo" | "suspendido" | "pendiente"
}

export interface ComparativaEntry {
  id: string
  date: string
  comercialId?: string
}

export interface VariationResult {
  value: number
  previousValue: number
  percentChange: number | null
}

export type PipelineBucket = "en_proceso" | "activo" | "bajas" | "ko"

export interface PipelinePorEstado {
  en_proceso: number
  activo: number
  bajas: number
  ko: number
  total: number
}

export interface TopComercialRanking {
  comercialId: string
  fullName: string
  activos: number
}

export interface MonthlyActivationPoint {
  monthKey: string
  nuevos: number
  activaciones: number
  bajas: number
}

export const PIPELINE_BUCKET_META: {
  id: PipelineBucket
  label: string
  barClass: string
}[] = [
  { id: "en_proceso", label: "En proceso", barClass: "bg-amber-400" },
  { id: "activo", label: "Activo", barClass: "bg-emerald-500" },
  { id: "bajas", label: "Bajas", barClass: "bg-rose-500" },
  { id: "ko", label: "KO", barClass: "bg-rose-900" },
]

export function matchesComercialFilter(
  comercialId: string,
  filterComercialId: string | null
): boolean {
  if (!filterComercialId) return true
  return comercialId === filterComercialId
}

export function filterContractsByDashboard(
  contracts: Contract[],
  filtros: DashboardFilters
): Contract[] {
  return contracts.filter((c) => {
    if (!matchesComercialFilter(c.comercialId, filtros.comercialId)) return false
    if (!isDateInRange(c.createdAt, filtros.dateFrom, filtros.dateTo)) return false
    return true
  })
}

export function getPipelineBucket(estado: string): PipelineBucket | null {
  const normalized = normalizeContractEstado(estado)
  if (normalized === "ACTIVADO") return "activo"
  if (normalized === "Dado de Baja") return "bajas"
  if (normalized === "INCIDENCIA ADMINISTRATIVA" || normalized === "FIRMA CADUCADA") {
    return "ko"
  }
  if (
    normalized === "Pendiente de info." ||
    normalized === "PTE DE TRAMITACIÓN" ||
    normalized === "PTE DE FIRMA" ||
    normalized === "TRAMITANDO"
  ) {
    return "en_proceso"
  }
  return null
}

export function computePercentChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

function getMonthBounds(year: number, month: number): { from: string; to: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { from: toIsoDate(start), to: toIsoDate(end) }
}

function isInMonth(dateStr: string, year: number, month: number): boolean {
  const { from, to } = getMonthBounds(year, month)
  return isDateInRange(dateStr.slice(0, 10), from, to)
}

export function contratosActivos(
  contracts: Contract[],
  filtros: DashboardFilters
): number {
  return filterContractsByDashboard(contracts, filtros).filter((c) =>
    isContractActivado(c.estado)
  ).length
}

export function contratosNuevosEsteMes(
  contracts: Contract[],
  filtros: DashboardFilters,
  reference = new Date()
): VariationResult {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  const prev = addMonths(reference, -1)

  const pool = contracts.filter((c) =>
    matchesComercialFilter(c.comercialId, filtros.comercialId)
  )

  const thisMonth = pool.filter((c) => isInMonth(c.createdAt, year, month)).length
  const prevMonth = pool.filter((c) =>
    isInMonth(c.createdAt, prev.getFullYear(), prev.getMonth())
  ).length

  const intersectsCurrentMonth =
    isDateInRange(toIsoDate(new Date(year, month, 1)), filtros.dateFrom, filtros.dateTo) ||
    isDateInRange(toIsoDate(reference), filtros.dateFrom, filtros.dateTo)

  if (!intersectsCurrentMonth) {
    return { value: 0, previousValue: 0, percentChange: 0 }
  }

  return {
    value: thisMonth,
    previousValue: prevMonth,
    percentChange: computePercentChange(thisMonth, prevMonth),
  }
}

export function bajasEsteMes(
  contracts: Contract[],
  filtros: DashboardFilters,
  reference = new Date()
): VariationResult {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  const prev = addMonths(reference, -1)

  function countBajasInMonth(y: number, m: number): number {
    return contracts.filter((c) => {
      if (!matchesComercialFilter(c.comercialId, filtros.comercialId)) return false
      if (normalizeContractEstado(c.estado) !== "Dado de Baja") return false
      const dateStr = (c.fechaBaja ?? c.createdAt).slice(0, 10)
      return isInMonth(dateStr, y, m)
    }).length
  }

  const value = countBajasInMonth(year, month)
  const previousValue = countBajasInMonth(prev.getFullYear(), prev.getMonth())

  return {
    value,
    previousValue,
    percentChange: computePercentChange(value, previousValue),
  }
}

export function incidenciasAbiertas(
  incidencias: IncidenciaTicket[],
  filtros: DashboardFilters
): number {
  return incidencias.filter((inc) => {
    if (!isIncidenciaAbierta(inc.estado)) return false
    if (!matchesComercialFilter(inc.comercialId, filtros.comercialId)) return false
    if (inc.createdAt && !isDateInRange(inc.createdAt, filtros.dateFrom, filtros.dateTo)) {
      return false
    }
    return true
  }).length
}

export function comparativasSemana(
  comparativas: ComparativaEntry[],
  filtros: DashboardFilters,
  reference = new Date()
): VariationResult {
  const end = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  )
  const weekStart = new Date(end)
  weekStart.setDate(end.getDate() - 6)
  const prevWeekEnd = new Date(weekStart)
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
  const prevWeekStart = new Date(prevWeekEnd)
  prevWeekStart.setDate(prevWeekStart.getDate() - 6)

  function countInRange(from: Date, to: Date): number {
    return comparativas.filter((c) => {
      if (c.comercialId && !matchesComercialFilter(c.comercialId, filtros.comercialId)) {
        return false
      }
      if (!c.comercialId && filtros.comercialId) return false
      const d = c.date.slice(0, 10)
      return isDateInRange(d, toIsoDate(from), toIsoDate(to))
    }).length
  }

  const value = countInRange(weekStart, end)
  const previousValue = countInRange(prevWeekStart, prevWeekEnd)

  return {
    value,
    previousValue,
    percentChange: computePercentChange(value, previousValue),
  }
}

export function totalComerciales(
  comerciales: DashboardComercial[],
  filtros: DashboardFilters
): number {
  const activos = comerciales.filter(
    (c) =>
      (c.role === "comercial" || c.role === "jefe_comercial") &&
      c.status !== "suspendido"
  )
  if (filtros.comercialId) {
    return activos.some((c) => c.id === filtros.comercialId) ? 1 : 0
  }
  return activos.length
}

export function pipelinePorEstado(
  contracts: Contract[],
  filtros: DashboardFilters
): PipelinePorEstado {
  const counts: PipelinePorEstado = {
    en_proceso: 0,
    activo: 0,
    bajas: 0,
    ko: 0,
    total: 0,
  }

  for (const contract of filterContractsByDashboard(contracts, filtros)) {
    const bucket = getPipelineBucket(contract.estado)
    if (!bucket) continue
    counts[bucket] += 1
    counts.total += 1
  }

  return counts
}

export function top5ComercialesPorContratosActivos(
  contracts: Contract[],
  comerciales: DashboardComercial[],
  filtros: DashboardFilters
): TopComercialRanking[] {
  const counts = new Map<string, number>()

  for (const contract of filterContractsByDashboard(contracts, filtros)) {
    if (!isContractActivado(contract.estado)) continue
    counts.set(contract.comercialId, (counts.get(contract.comercialId) ?? 0) + 1)
  }

  const nameById = new Map(comerciales.map((c) => [c.id, c.fullName]))

  return Array.from(counts.entries())
    .map(([comercialId, activos]) => ({
      comercialId,
      fullName: nameById.get(comercialId) ?? "Comercial desconocido",
      activos,
    }))
    .sort((a, b) => b.activos - a.activos)
    .slice(0, 5)
}

export function activacionesMensuales12Meses(
  contracts: Contract[],
  filtros: DashboardFilters,
  reference = new Date()
): MonthlyActivationPoint[] {
  const keys = last12MonthKeys(reference)

  return keys.map((monthKey) => {
    const { year, month } = parseMonthKey(monthKey)
    const { from, to } = getMonthBounds(year, month)

    const pool = contracts.filter((c) => {
      if (!matchesComercialFilter(c.comercialId, filtros.comercialId)) return false
      return true
    })

    const nuevos = pool.filter((c) => isInMonth(c.createdAt, year, month)).length

    const activaciones = pool.filter(
      (c) => isContractActivado(c.estado) && isInMonth(c.createdAt, year, month)
    ).length

    const bajas = pool.filter((c) => {
      if (normalizeContractEstado(c.estado) !== "Dado de Baja") return false
      const dateStr = (c.fechaBaja ?? c.createdAt).slice(0, 10)
      return isInMonth(dateStr, year, month)
    }).length

    const monthInGlobalRange =
      isDateInRange(from, filtros.dateFrom, filtros.dateTo) ||
      isDateInRange(to, filtros.dateFrom, filtros.dateTo)

    if (!monthInGlobalRange && filtros.dateFrom && filtros.dateTo) {
      return { monthKey, nuevos: 0, activaciones: 0, bajas: 0 }
    }

    return { monthKey, nuevos, activaciones, bajas }
  })
}

export function getMonthKeyFromContract(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10))
  return getMonthKey(d.getFullYear(), d.getMonth())
}
