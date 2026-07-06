import {
  ARCHIVO_FASES,
  FUNNEL_ORDER,
  getFaseConfig,
  MOTIVOS_DESCARTE,
} from "./pipeline"
import type { VentasActor } from "./hooks/types"
import type {
  ActividadVenta,
  Prospecto,
  ProspectoFase,
  TareaVenta,
} from "./types"

export interface FunnelStageMetric {
  fase: ProspectoFase
  label: string
  count: number
  conversionToNextPct: number | null
}

export interface DescarteMetric {
  motivo: string
  label: string
  count: number
}

export interface ActividadComercialRow {
  comercialId: string
  comercialName: string
  actividadesCount: number
  tareasCompletadasCount: number
}

export function isWithinDays(iso: string, days: number, referenceDate = new Date()): boolean {
  const d = new Date(iso)
  const start = new Date(referenceDate)
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return d >= start
}

export function periodStartIso(days: number, referenceDate = new Date()): string {
  const start = new Date(referenceDate)
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export function filterActividadesByPeriod(
  actividades: ActividadVenta[],
  days: number,
  referenceDate = new Date()
): ActividadVenta[] {
  return actividades.filter((a) => isWithinDays(a.createdAt, days, referenceDate))
}

export function filterTareasCompletadasEnPeriodo(
  tareas: TareaVenta[],
  days: number,
  referenceDate = new Date()
): TareaVenta[] {
  return tareas.filter(
    (t) =>
      t.estado === "completada" &&
      t.completadaAt &&
      isWithinDays(t.completadaAt, days, referenceDate)
  )
}

export function filterProspectosForReportingScope(
  prospectos: Prospecto[],
  actor: VentasActor,
  teamMemberIds: string[],
  selectedComercialId?: string | null
): Prospecto[] {
  if (selectedComercialId) {
    return prospectos.filter((p) => p.comercialId === selectedComercialId)
  }
  if (actor.role === "comercial") {
    return prospectos.filter((p) => p.comercialId === actor.comercialId)
  }
  if (actor.role === "jefe_comercial") {
    const allowed = new Set([actor.comercialId, ...teamMemberIds])
    return prospectos.filter((p) => allowed.has(p.comercialId))
  }
  return prospectos
}

export function computeFunnelMetrics(prospectos: Prospecto[]): FunnelStageMetric[] {
  const active = prospectos.filter((p) => !ARCHIVO_FASES.includes(p.fase))
  const counts = new Map<ProspectoFase, number>()
  for (const fase of FUNNEL_ORDER) counts.set(fase, 0)
  for (const p of active) {
    if (FUNNEL_ORDER.includes(p.fase as (typeof FUNNEL_ORDER)[number])) {
      counts.set(p.fase, (counts.get(p.fase) ?? 0) + 1)
    }
  }

  return FUNNEL_ORDER.map((fase, idx) => {
    const count = counts.get(fase) ?? 0
    const nextFase = FUNNEL_ORDER[idx + 1]
    let conversionToNextPct: number | null = null
    if (nextFase) {
      const nextCount = counts.get(nextFase) ?? 0
      conversionToNextPct = count > 0 ? Math.round((nextCount / count) * 100) : 0
    }
    return {
      fase,
      label: getFaseConfig(fase).label,
      count,
      conversionToNextPct,
    }
  })
}

export function aggregateDescartesByMotivo(prospectos: Prospecto[]): DescarteMetric[] {
  const descartados = prospectos.filter((p) => p.fase === "descartado" && p.motivoDescarte)
  const byMotivo = new Map<string, number>()
  for (const p of descartados) {
    const m = p.motivoDescarte!
    byMotivo.set(m, (byMotivo.get(m) ?? 0) + 1)
  }
  return MOTIVOS_DESCARTE
    .map((m) => ({
      motivo: m.id,
      label: m.label,
      count: byMotivo.get(m.id) ?? 0,
    }))
    .filter((row) => row.count > 0)
}

export function aggregateActividadPorComercial(
  actividades: ActividadVenta[],
  tareas: TareaVenta[],
  comercialId: string,
  comercialName: string,
  days: number,
  referenceDate = new Date()
): ActividadComercialRow {
  const actividadesCount = filterActividadesByPeriod(
    actividades.filter((a) => a.comercialId === comercialId),
    days,
    referenceDate
  ).length
  const tareasCompletadasCount = filterTareasCompletadasEnPeriodo(
    tareas.filter((t) => t.comercialId === comercialId),
    days,
    referenceDate
  ).length
  return {
    comercialId,
    comercialName,
    actividadesCount,
    tareasCompletadasCount,
  }
}
