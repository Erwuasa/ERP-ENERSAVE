import { AlertTriangle, Filter, GitBranch, Layers, UserRound } from "lucide-react"
import {
  PIPELINE_FASE_CONFIG,
  SUBTIPOS_PROSPECTO,
} from "../../lib/ventas/pipeline"
import type { PipelineFilterState } from "./ventas-ui"
import { SelectFilterDropdown } from "../ui/SelectFilterDropdown"
import { FilterTriggerButton } from "../ui/FilterTriggerButton"

interface PipelineProfile {
  id: string
  fullName: string
  role: string
}

interface PipelineFiltersProps {
  filters: PipelineFilterState
  onChange: (filters: PipelineFilterState) => void
  showComercialFilter: boolean
  profiles: PipelineProfile[]
}

const PRIORIDAD_OPTIONS = [
  { id: "alta", label: "Alta" },
  { id: "media", label: "Media" },
  { id: "baja", label: "Baja" },
] as const

const FASE_DEFAULT = ""
const SUBTIPO_DEFAULT = ""
const COMERCIAL_DEFAULT = ""
const PRIORIDAD_DEFAULT = ""

export function PipelineFilters({
  filters,
  onChange,
  showComercialFilter,
  profiles,
}: PipelineFiltersProps) {
  const comerciales = profiles.filter(
    (p) => p.role === "comercial" || p.role === "jefe_comercial"
  )

  const faseOptions = [
    { id: FASE_DEFAULT, label: "Todas las fases" },
    ...PIPELINE_FASE_CONFIG.map((f) => ({ id: f.id, label: f.label })),
  ]

  const subtipoOptions = [
    { id: SUBTIPO_DEFAULT, label: "Todos los subtipos" },
    ...SUBTIPOS_PROSPECTO.map((s) => ({ id: s.id, label: s.label })),
  ]

  const comercialOptions = [
    { id: COMERCIAL_DEFAULT, label: "Todos los comerciales" },
    ...comerciales.map((c) => ({ id: c.id, label: c.fullName })),
  ]

  const prioridadOptions = [
    { id: PRIORIDAD_DEFAULT, label: "Todas las prioridades" },
    ...PRIORIDAD_OPTIONS.map((p) => ({ id: p.id, label: p.label })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-brand-border bg-brand-panel/50">
      <Filter className="w-3.5 h-3.5 text-brand-subtext shrink-0" />

      <SelectFilterDropdown
        label="Fase"
        value={filters.fase ?? FASE_DEFAULT}
        defaultValue={FASE_DEFAULT}
        options={faseOptions}
        onChange={(fase) =>
          onChange({ ...filters, fase: fase ? (fase as PipelineFilterState["fase"]) : undefined })
        }
        icon={<GitBranch className="w-3.5 h-3.5 text-brand-subtext shrink-0" />}
      />

      <SelectFilterDropdown
        label="Subtipo"
        value={filters.subtipo ?? SUBTIPO_DEFAULT}
        defaultValue={SUBTIPO_DEFAULT}
        options={subtipoOptions}
        onChange={(subtipo) =>
          onChange({
            ...filters,
            subtipo: subtipo ? (subtipo as PipelineFilterState["subtipo"]) : undefined,
          })
        }
        icon={<Layers className="w-3.5 h-3.5 text-brand-subtext shrink-0" />}
      />

      {showComercialFilter && (
        <SelectFilterDropdown
          label="Comercial"
          value={filters.comercialId ?? COMERCIAL_DEFAULT}
          defaultValue={COMERCIAL_DEFAULT}
          options={comercialOptions}
          onChange={(comercialId) =>
            onChange({ ...filters, comercialId: comercialId || undefined })
          }
          icon={<UserRound className="w-3.5 h-3.5 text-brand-subtext shrink-0" />}
          minWidthClass="min-w-[180px]"
          panelWidthClass="w-[min(100vw-1rem,300px)]"
          maxWidth={300}
        />
      )}

      <SelectFilterDropdown
        label="Prioridad"
        value={filters.prioridad ?? PRIORIDAD_DEFAULT}
        defaultValue={PRIORIDAD_DEFAULT}
        options={prioridadOptions}
        onChange={(prioridad) =>
          onChange({
            ...filters,
            prioridad: prioridad ? (prioridad as PipelineFilterState["prioridad"]) : undefined,
          })
        }
        icon={<AlertTriangle className="w-3.5 h-3.5 text-brand-subtext shrink-0" />}
      />

      <SlaBreachFilter
        active={Boolean(filters.slaBreach)}
        onChange={(slaBreach) => onChange({ ...filters, slaBreach: slaBreach || undefined })}
      />
    </div>
  )
}

function SlaBreachFilter({
  active,
  onChange,
}: {
  active: boolean
  onChange: (active: boolean) => void
}) {
  return (
    <FilterTriggerButton
      label="SLA vencido"
      valueLabel="Activo"
      isActive={active}
      open={false}
      onToggle={() => {
        if (!active) onChange(true)
      }}
      onClear={() => onChange(false)}
      minWidthClass="min-w-[130px]"
    />
  )
}
