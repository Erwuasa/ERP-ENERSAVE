import { Fragment, type ReactNode } from "react"
import { Search } from "lucide-react"
import type { IncidenciaTicket } from "@/lib/incidencias"
import {
  INCIDENCIA_PRIORIDAD_CHIPS,
  type IncidenciaAsignacionTab,
} from "@/lib/incidencias-filters"
import { IncidenciasKanban } from "@/pages/erp/incidencias/components/IncidenciasKanban"
import { IncidenciaEstadoFilterDropdown } from "@/components/incidencias/IncidenciaEstadoFilterDropdown"
import { IncidenciaOrigenFilterDropdown } from "@/components/incidencias/IncidenciaOrigenFilterDropdown"
import { SelectFilterDropdown } from "@/components/ui/SelectFilterDropdown"
import { useIncidenciasPanel } from "@/pages/erp/incidencias/hooks/useIncidenciasPanel"
import { IncidenciasFilterPill } from "@/pages/erp/incidencias/components/IncidenciasFilterPill"

const ASIGNACION_TABS: { id: IncidenciaAsignacionTab; label: string }[] = [
  { id: "sin_asignar", label: "Sin asignar" },
  { id: "mis_incidencias", label: "Mis incidencias" },
  { id: "equipo", label: "Equipo" },
]

export interface IncidenciasPanelProps {
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
  const vm = useIncidenciasPanel({ incidencias, activeUserId, activeRole, teamMemberIds })
  const visibleTabs = ASIGNACION_TABS.filter((tab) => tab.id !== "equipo" || vm.showEquipoTab)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-end text-xs">
        <span className="font-mono text-brand-subtext">Abiertas: {vm.abiertasCount}</span>
      </div>

      {createForm}

      <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm dark:shadow-none space-y-4">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <Fragment key={tab.id}>
              <IncidenciasFilterPill
                active={vm.asignacionTab === tab.id}
                onClick={() => vm.setAsignacionTab(tab.id)}
              >
                {tab.label}
              </IncidenciasFilterPill>
            </Fragment>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
            <input
              type="search"
              value={vm.searchQuery}
              onChange={(e) => vm.setSearchQuery(e.target.value)}
              placeholder="Buscar por código, título, descripción, canal..."
              className="w-full h-9 pl-9 pr-3 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text placeholder:text-brand-subtext/70"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <IncidenciaEstadoFilterDropdown
              value={vm.estadoFilter}
              onChange={vm.setEstadoFilter}
              counts={vm.estadoCounts}
            />
            <IncidenciaOrigenFilterDropdown
              value={vm.origenFilter}
              onChange={vm.setOrigenFilter}
              counts={vm.origenCounts}
            />
            <SelectFilterDropdown
              label="Prioridad"
              value={vm.prioridadFilter}
              defaultValue="todos"
              options={INCIDENCIA_PRIORIDAD_CHIPS.map((chip) => ({
                id: chip.id,
                label: chip.label,
              }))}
              onChange={(next) => vm.setPrioridadFilter(next as typeof vm.prioridadFilter)}
              minWidthClass="min-w-[140px]"
            />
          </div>
        </div>

        <IncidenciasKanban
          incidencias={vm.filteredIncidencias}
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
