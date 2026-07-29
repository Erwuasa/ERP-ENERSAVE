import type {
  IncidenciaEstado,
  IncidenciaOrigen,
  IncidenciaTicket,
} from "./incidencias"
import { getPrioridadFilterKey } from "./incidencias"

export type IncidenciaAsignacionTab = "sin_asignar" | "mis_incidencias" | "equipo"

export type IncidenciaEstadoFilter = "todos" | IncidenciaEstado

export type IncidenciaOrigenFilter = "todos" | IncidenciaOrigen

export type IncidenciaPrioridadFilter =
  | "todos"
  | "critica"
  | "alta"
  | "media"
  | "baja"
  | "sin_categorizar"

export interface IncidenciaFilterOptions {
  asignacionTab: IncidenciaAsignacionTab
  searchQuery: string
  estadoFilter: IncidenciaEstadoFilter
  origenFilter: IncidenciaOrigenFilter
  prioridadFilter: IncidenciaPrioridadFilter
  activeUserId: string
  teamMemberIds: string[]
}

export const INCIDENCIA_ESTADO_META: {
  id: IncidenciaEstadoFilter
  label: string
  badgeClass: string
}[] = [
  { id: "todos", label: "Todos", badgeClass: "bg-slate-500/15 text-slate-600" },
  {
    id: "sin_categorizar",
    label: "Sin categorizar",
    badgeClass: "bg-slate-500/15 text-slate-500",
  },
  { id: "abierto", label: "Abierto", badgeClass: "bg-blue-500/15 text-blue-600" },
  {
    id: "en_progreso",
    label: "En progreso",
    badgeClass: "bg-violet-500/15 text-violet-600",
  },
  { id: "resuelto", label: "Resuelto", badgeClass: "bg-emerald-500/15 text-emerald-600" },
  { id: "cerrado", label: "Cerrado", badgeClass: "bg-slate-600/15 text-slate-500" },
]

export const INCIDENCIA_ORIGEN_META: {
  id: IncidenciaOrigenFilter
  label: string
}[] = [
  { id: "todos", label: "Todos" },
  { id: "manual", label: "Manual" },
  { id: "comercial", label: "Comercial" },
  { id: "sistema", label: "Sistema" },
  { id: "cliente", label: "Cliente" },
]

export const INCIDENCIA_PRIORIDAD_CHIPS: {
  id: IncidenciaPrioridadFilter
  label: string
  activeClass: string
}[] = [
  { id: "todos", label: "Todas", activeClass: "bg-emerald-600 text-white border-emerald-600" },
  {
    id: "critica",
    label: "Crítica",
    activeClass: "bg-rose-600 text-white border-rose-600",
  },
  {
    id: "alta",
    label: "Alta",
    activeClass: "bg-orange-600 text-white border-orange-600",
  },
  {
    id: "media",
    label: "Media",
    activeClass: "bg-amber-500 text-white border-amber-500",
  },
  { id: "baja", label: "Baja", activeClass: "bg-emerald-600 text-white border-emerald-600" },
  {
    id: "sin_categorizar",
    label: "Sin categorizar",
    activeClass: "bg-slate-500 text-white border-slate-500",
  },
]

function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

export function matchesIncidenciaSearch(inc: IncidenciaTicket, query: string): boolean {
  if (!query.trim()) return true
  const q = foldSearchText(query)
  const haystack = [inc.codigo, inc.tipo, inc.descripcion, inc.canal, inc.clientName]
    .filter(Boolean)
    .map((v) => foldSearchText(String(v)))
  return haystack.some((v) => v.includes(q))
}

function matchesAsignacionTab(
  inc: IncidenciaTicket,
  tab: IncidenciaAsignacionTab,
  activeUserId: string,
  teamMemberIds: string[]
): boolean {
  if (tab === "sin_asignar") return !inc.asignadoA
  if (tab === "mis_incidencias") return inc.asignadoA === activeUserId
  const teamIds = new Set(teamMemberIds)
  return teamIds.has(inc.comercialId)
}

export function applyIncidenciasPanelFilters(
  incidencias: IncidenciaTicket[],
  opts: IncidenciaFilterOptions & {
    skipEstado?: boolean
    skipOrigen?: boolean
    skipPrioridad?: boolean
    skipAsignacion?: boolean
    skipSearch?: boolean
  }
): IncidenciaTicket[] {
  return incidencias.filter((inc) => {
    if (
      !opts.skipAsignacion &&
      !matchesAsignacionTab(
        inc,
        opts.asignacionTab,
        opts.activeUserId,
        opts.teamMemberIds
      )
    ) {
      return false
    }
    if (!opts.skipSearch && !matchesIncidenciaSearch(inc, opts.searchQuery)) {
      return false
    }
    if (
      !opts.skipEstado &&
      opts.estadoFilter !== "todos" &&
      inc.estado !== opts.estadoFilter
    ) {
      return false
    }
    if (
      !opts.skipOrigen &&
      opts.origenFilter !== "todos" &&
      inc.origen !== opts.origenFilter
    ) {
      return false
    }
    if (!opts.skipPrioridad && opts.prioridadFilter !== "todos") {
      const key = getPrioridadFilterKey(inc.prioridad)
      if (key !== opts.prioridadFilter) return false
    }
    return true
  })
}

export function countIncidenciasByEstado(
  incidencias: IncidenciaTicket[]
): Record<IncidenciaEstadoFilter, number> {
  const counts: Record<IncidenciaEstadoFilter, number> = {
    todos: incidencias.length,
    sin_categorizar: 0,
    abierto: 0,
    en_progreso: 0,
    resuelto: 0,
    cerrado: 0,
  }
  for (const inc of incidencias) {
    counts[inc.estado] += 1
  }
  return counts
}

export function countIncidenciasByOrigen(
  incidencias: IncidenciaTicket[]
): Record<IncidenciaOrigenFilter, number> {
  const counts: Record<IncidenciaOrigenFilter, number> = {
    todos: incidencias.length,
    manual: 0,
    comercial: 0,
    sistema: 0,
    cliente: 0,
  }
  for (const inc of incidencias) {
    counts[inc.origen] += 1
  }
  return counts
}

export function countIncidenciasByPrioridad(
  incidencias: IncidenciaTicket[]
): Record<IncidenciaPrioridadFilter, number> {
  const counts: Record<IncidenciaPrioridadFilter, number> = {
    todos: incidencias.length,
    critica: 0,
    alta: 0,
    media: 0,
    baja: 0,
    sin_categorizar: 0,
  }
  for (const inc of incidencias) {
    const key = getPrioridadFilterKey(inc.prioridad)
    counts[key] += 1
  }
  return counts
}
