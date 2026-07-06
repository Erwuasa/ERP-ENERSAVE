import { Filter, X } from "lucide-react"
import {
  PIPELINE_FASE_CONFIG,
  SUBTIPOS_PROSPECTO,
} from "../../lib/ventas/pipeline"
import type { PipelineFilterState } from "./ventas-ui"

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

export function PipelineFilters({
  filters,
  onChange,
  showComercialFilter,
  profiles,
}: PipelineFiltersProps) {
  const comerciales = profiles.filter(
    (p) => p.role === "comercial" || p.role === "jefe_comercial"
  )

  const hasActiveFilters =
    filters.fase ||
    filters.subtipo ||
    filters.comercialId ||
    filters.prioridad ||
    filters.slaBreach

  function clearFilters() {
    onChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-brand-border bg-brand-panel/50">
      <Filter className="w-3.5 h-3.5 text-brand-subtext shrink-0" />

      <select
        value={filters.fase ?? ""}
        onChange={(e) =>
          onChange({ ...filters, fase: e.target.value ? (e.target.value as PipelineFilterState["fase"]) : undefined })
        }
        className="h-8 px-2 bg-brand-bg border border-brand-border rounded-lg text-[11px] text-brand-text focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      >
        <option value="">Todas las fases</option>
        {PIPELINE_FASE_CONFIG.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      <select
        value={filters.subtipo ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            subtipo: e.target.value ? (e.target.value as PipelineFilterState["subtipo"]) : undefined,
          })
        }
        className="h-8 px-2 bg-brand-bg border border-brand-border rounded-lg text-[11px] text-brand-text focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      >
        <option value="">Todos los subtipos</option>
        {SUBTIPOS_PROSPECTO.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>

      {showComercialFilter && (
        <select
          value={filters.comercialId ?? ""}
          onChange={(e) =>
            onChange({ ...filters, comercialId: e.target.value || undefined })
          }
          className="h-8 px-2 bg-brand-bg border border-brand-border rounded-lg text-[11px] text-brand-text focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          <option value="">Todos los comerciales</option>
          {comerciales.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </select>
      )}

      <select
        value={filters.prioridad ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            prioridad: e.target.value ? (e.target.value as PipelineFilterState["prioridad"]) : undefined,
          })
        }
        className="h-8 px-2 bg-brand-bg border border-brand-border rounded-lg text-[11px] text-brand-text focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      >
        <option value="">Todas las prioridades</option>
        {PRIORIDAD_OPTIONS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 h-8 px-2 border border-brand-border rounded-lg bg-brand-bg text-[11px] text-brand-text cursor-pointer">
        <input
          type="checkbox"
          checked={filters.slaBreach ?? false}
          onChange={(e) => onChange({ ...filters, slaBreach: e.target.checked || undefined })}
          className="rounded border-brand-border"
        />
        <span className="font-mono uppercase text-[10px]">SLA vencido</span>
      </label>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="h-8 px-2 flex items-center gap-1 text-[10px] font-mono uppercase text-brand-subtext hover:text-brand-text transition-colors"
        >
          <X className="w-3 h-3" />
          Limpiar
        </button>
      )}
    </div>
  )
}
