import { useMemo, useState } from "react"
import type { IncidenciaTicket } from "@/lib/incidencias"
import { isIncidenciaAbierta, isIncidenciaKanbanVisible } from "@/lib/incidencias"
import {
  applyIncidenciasPanelFilters,
  countIncidenciasByEstado,
  countIncidenciasByOrigen,
  type IncidenciaAsignacionTab,
  type IncidenciaEstadoFilter,
  type IncidenciaOrigenFilter,
  type IncidenciaPrioridadFilter,
} from "@/lib/incidencias-filters"

type Options = {
  incidencias: IncidenciaTicket[]
  activeUserId: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  teamMemberIds: string[]
}

export function useIncidenciasPanel({
  incidencias,
  activeUserId,
  activeRole,
  teamMemberIds,
}: Options) {
  const [asignacionTab, setAsignacionTab] = useState<IncidenciaAsignacionTab>("sin_asignar")
  const [searchQuery, setSearchQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<IncidenciaEstadoFilter>("todos")
  const [origenFilter, setOrigenFilter] = useState<IncidenciaOrigenFilter>("todos")
  const [prioridadFilter, setPrioridadFilter] = useState<IncidenciaPrioridadFilter>("todos")

  const showEquipoTab =
    activeRole === "jefe_comercial" ||
    activeRole === "superadmin" ||
    activeRole === "tramitacion"

  const kanbanPool = useMemo(
    () => incidencias.filter((inc) => isIncidenciaKanbanVisible(inc)),
    [incidencias]
  )

  const filterOpts = useMemo(
    () => ({
      asignacionTab,
      searchQuery,
      estadoFilter,
      origenFilter,
      prioridadFilter,
      activeUserId,
      teamMemberIds,
    }),
    [
      asignacionTab,
      searchQuery,
      estadoFilter,
      origenFilter,
      prioridadFilter,
      activeUserId,
      teamMemberIds,
    ]
  )

  const poolForEstadoCounts = useMemo(
    () => applyIncidenciasPanelFilters(kanbanPool, { ...filterOpts, skipEstado: true }),
    [kanbanPool, filterOpts]
  )

  const poolForOrigenCounts = useMemo(
    () => applyIncidenciasPanelFilters(kanbanPool, { ...filterOpts, skipOrigen: true }),
    [kanbanPool, filterOpts]
  )

  const filteredIncidencias = useMemo(
    () => applyIncidenciasPanelFilters(kanbanPool, filterOpts),
    [kanbanPool, filterOpts]
  )

  const estadoCounts = useMemo(
    () => countIncidenciasByEstado(poolForEstadoCounts),
    [poolForEstadoCounts]
  )

  const origenCounts = useMemo(
    () => countIncidenciasByOrigen(poolForOrigenCounts),
    [poolForOrigenCounts]
  )

  const abiertasCount = useMemo(
    () => kanbanPool.filter((i) => isIncidenciaAbierta(i.estado)).length,
    [kanbanPool]
  )

  return {
    asignacionTab,
    setAsignacionTab,
    searchQuery,
    setSearchQuery,
    estadoFilter,
    setEstadoFilter,
    origenFilter,
    setOrigenFilter,
    prioridadFilter,
    setPrioridadFilter,
    showEquipoTab,
    filteredIncidencias,
    estadoCounts,
    origenCounts,
    abiertasCount,
  }
}
