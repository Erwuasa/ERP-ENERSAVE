import { normalizeCompaniaKey } from "../erp/compania-logos"
import {
  bool,
  num,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "retrocomision_schedules"
const CACHE_TTL_MS = 5 * 60 * 1000

const SCHEDULE_SELECT =
  "id, compania, segmento, peaje_tramo, tipo_calculo, meses_flat, tramos, notas, activo"

export type RetrocomisionSegmento = "residencial" | "pyme" | "ambos"
export type RetrocomisionTipoCalculo =
  | "meses_flat"
  | "tramos_porcentaje"
  | "tramos_fijo_eur"

export type RetrocomisionTramoUnidad = "porcentaje" | "eur_fijo"

export interface RetrocomisionTramo {
  desde_mes: number
  hasta_mes: number
  valor: number
  unidad: RetrocomisionTramoUnidad
}

export interface RetrocomisionSchedule {
  id: string
  compania: string
  segmento: RetrocomisionSegmento
  peajeTramo: string | null
  tipoCalculo: RetrocomisionTipoCalculo
  mesesFlat: number | null
  tramos: RetrocomisionTramo[]
  notas: string | null
  activo: boolean
}

interface ScheduleCache {
  data: RetrocomisionSchedule[]
  expiresAt: number
}

let scheduleCache: ScheduleCache | null = null

function parseTramos(raw: unknown): RetrocomisionTramo[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): RetrocomisionTramo | null => {
      if (!item || typeof item !== "object") return null
      const row = item as Row
      const desdeMes = num(row.desde_mes)
      const hastaMes = num(row.hasta_mes)
      const valor = num(row.valor)
      const unidad = str(row.unidad)
      if (desdeMes == null || hastaMes == null || valor == null) return null
      if (unidad !== "porcentaje" && unidad !== "eur_fijo") return null
      return { desde_mes: desdeMes, hasta_mes: hastaMes, valor, unidad }
    })
    .filter((item): item is RetrocomisionTramo => item != null)
}

function mapRowToSchedule(row: Row): RetrocomisionSchedule {
  const segmento = str(row.segmento)
  const tipoCalculo = str(row.tipo_calculo)

  return {
    id: String(row.id ?? ""),
    compania: str(row.compania) ?? "",
    segmento:
      segmento === "residencial" || segmento === "pyme" || segmento === "ambos"
        ? segmento
        : "ambos",
    peajeTramo: str(row.peaje_tramo) ?? null,
    tipoCalculo:
      tipoCalculo === "meses_flat" ||
      tipoCalculo === "tramos_porcentaje" ||
      tipoCalculo === "tramos_fijo_eur"
        ? tipoCalculo
        : "meses_flat",
    mesesFlat: num(row.meses_flat) ?? null,
    tramos: parseTramos(row.tramos),
    notas: str(row.notas) ?? null,
    activo: row.activo == null ? true : bool(row.activo),
  }
}

export function clearRetrocomisionSchedulesCache(): void {
  scheduleCache = null
}

export function getCachedRetrocomisionSchedules(): RetrocomisionSchedule[] {
  if (!scheduleCache || scheduleCache.expiresAt <= Date.now()) return []
  return scheduleCache.data
}

export function setRetrocomisionSchedulesCacheForTests(
  schedules: RetrocomisionSchedule[]
): void {
  scheduleCache = {
    data: schedules,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
}

export function scheduleCompaniaMatches(
  scheduleCompania: string,
  compania: string
): boolean {
  const a = normalizeCompaniaKey(scheduleCompania)
  const b = normalizeCompaniaKey(compania)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

export async function listRetrocomisionSchedules(): Promise<
  SupabaseResult<RetrocomisionSchedule[]>
> {
  if (scheduleCache && scheduleCache.expiresAt > Date.now()) {
    return { ok: true, data: scheduleCache.data }
  }

  const clientOrError = resolveSupabaseClient()
  if (!clientOrError.ok) {
    return {
      ok: false,
      reason: clientOrError.reason,
      message: clientOrError.message,
    }
  }

  const { data, error } = await clientOrError.client
    .from(TABLE)
    .select(SCHEDULE_SELECT)
    .eq("activo", true)
    .order("compania")
    .order("segmento")
    .order("peaje_tramo")

  if (error) {
    return toSupabaseFailure(error, TABLE)
  }

  const rows = ((data ?? []) as Row[]).map(mapRowToSchedule)
  scheduleCache = {
    data: rows,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }

  return { ok: true, data: rows }
}
