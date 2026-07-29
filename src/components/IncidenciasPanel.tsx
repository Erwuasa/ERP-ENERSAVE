import { useMemo, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import type { IncidenciaTicket } from "../lib/incidencias"
import { isIncidenciaAbierta, isIncidenciaKanbanVisible } from "../lib/incidencias"
import {
  applyIncidenciasPanelFilters,
  countIncidenciasByEstado,
  countIncidenciasByOrigen,
  INCIDENCIA_PRIORIDAD_CHIPS,
  type IncidenciaAsignacionTab,
  type IncidenciaEstadoFilter,
  type IncidenciaOrigenFilter,
  type IncidenciaPrioridadFilter,
} from "../lib/incidencias-filters"
import { IncidenciasKanban } from "./IncidenciasKanban"
import { IncidenciaEstadoFilterDropdown } from "./incidencias/IncidenciaEstadoFilterDropdown"
import { IncidenciaOrigenFilterDropdown } from "./incidencias/IncidenciaOrigenFilterDropdown"
import { SelectFilterDropdown } from "./ui/SelectFilterDropdown"

interface IncidenciasPanelProps {
  incidencias: IncidenciaTicket[]
  activeUserId: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  teamMemberIds: string[]
  showComercialName: boolean
  canEdit: boolean
  canDrag: boolean
  onSave: (updated: IncidenciaTicket) => void
  onMove: (id: string, estado: IncidenciaTicket["estado"]) => void
  createForm?: ReactNode
}

function FilterPill({
  active,
  onClick,
  children,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  activeClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
        active
          ? activeClass ?? "bg-emerald-600 text-white border border-emerald-600"
          : "bg-brand-surface text-brand-subtext border border-brand-border hover:text-brand-text hover:border-cyan-500/30"
      }`}
    >
      {children}
    </button>
  )
}

const ASIGNACION_TABS: { id: IncidenciaAsignacionTab; label: string }[] = [
  { id: "sin_asignar", label: "Sin asignar" },
  { id: "mis_incidencias", label: "Mis incidencias" },
  { id: "equipo", label: "Equipo" },
]

export function IncidenciasPanel({
  incidencias,
  activeUserId,
  activeRole,
  teamMemberIds,
  showComercialName,
  canEdit,
  canDrag,
  onSave,
  onMove,
  createForm,
}: IncidenciasPanelProps) {
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

  const visibleTabs = ASIGNACION_TABS.filter(
    (tab) => tab.id !== "equipo" || showEquipoTab
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-end text-xs">
        <span className="font-mono text-brand-subtext">
          Abiertas: {abiertasCount}
        </span>
      </div>

      {createForm}

      <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm dark:shadow-none space-y-4">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <FilterPill
              key={tab.id}
              active={asignacionTab === tab.id}
              onClick={() => setAsignacionTab(tab.id)}
            >
              {tab.label}
            </FilterPill>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, título, descripción, canal..."
              className="w-full h-9 pl-9 pr-3 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text placeholder:text-brand-subtext/70"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <IncidenciaEstadoFilterDropdown
              value={estadoFilter}
              onChange={setEstadoFilter}
              counts={estadoCounts}
            />
            <IncidenciaOrigenFilterDropdown
              value={origenFilter}
              onChange={setOrigenFilter}
              counts={origenCounts}
            />
            <SelectFilterDropdown
              label="Prioridad"
              value={prioridadFilter}
              defaultValue="todos"
              options={INCIDENCIA_PRIORIDAD_CHIPS.map((chip) => ({
                id: chip.id,
                label: chip.label,
              }))}
              onChange={(next) => setPrioridadFilter(next as IncidenciaPrioridadFilter)}
              minWidthClass="min-w-[140px]"
            />
          </div>
        </div>

        <IncidenciasKanban
          incidencias={filteredIncidencias}
          showComercialName={showComercialName}
          canEdit={canEdit}
          canDrag={canDrag}
          onSave={onSave}
          onMove={onMove}
        />
      </div>
    </div>
  )
}
