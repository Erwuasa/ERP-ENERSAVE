import {
  canTransition,
  getSlaUrgencia,
  validateTransition,
} from "../../lib/ventas/pipeline"
import type { Prospecto, ProspectoFase, SubtipoProspecto, TareaPrioridad, TareaVenta } from "../../lib/ventas/types"

export type OpenFichaHandler = (prospecto: Prospecto) => void

export interface PipelineFilterState {
  fase?: ProspectoFase
  subtipo?: SubtipoProspecto
  comercialId?: string
  prioridad?: TareaPrioridad
  slaBreach?: boolean
}

const CONTEXT_REQUIRED_CODES = new Set([
  "subtipo_required",
  "sub_estado_required",
  "motivo_dudas_required",
  "motivo_required",
  "motivo_recontacto_required",
  "fecha_recontactar_required",
])

export function buildTareasByProspecto(tareas: TareaVenta[]): Map<string, TareaVenta> {
  const map = new Map<string, TareaVenta>()
  for (const tarea of tareas) {
    if (tarea.estado !== "pendiente") continue
    if (!map.has(tarea.prospectoId)) map.set(tarea.prospectoId, tarea)
  }
  return map
}

export function getProximaTareaLabel(tarea: TareaVenta | undefined): string {
  if (!tarea) return "Sin tarea pendiente"
  return tarea.titulo?.trim() || tarea.tipo.replace(/_/g, " ")
}

export function filterProspectos(
  prospectos: Prospecto[],
  filters: PipelineFilterState,
  tareasByProspecto: Map<string, TareaVenta>
): Prospecto[] {
  return prospectos.filter((p) => {
    if (filters.fase && p.fase !== filters.fase) return false
    if (filters.subtipo && p.subtipoProspecto !== filters.subtipo) return false
    if (filters.comercialId && p.comercialId !== filters.comercialId) return false

    const tarea = tareasByProspecto.get(p.id)
    if (filters.prioridad && tarea?.prioridad !== filters.prioridad) return false

    if (filters.slaBreach) {
      const urgencia = getSlaUrgencia({
        fase: p.fase,
        faseChangedAt: p.faseChangedAt,
        diasEnFase: p.diasEnFase,
        fechaProximoContacto: p.fechaProximoContacto,
        metadata: p.metadata,
        subtipoProspecto: p.subtipoProspecto,
      })
      if (urgencia !== "breach") return false
    }

    return true
  })
}

export function needsFaseChangeModal(from: ProspectoFase, to: ProspectoFase): boolean {
  if (!canTransition(from, to)) return false
  const result = validateTransition(from, to, {})
  if (result.ok) return false
  return CONTEXT_REQUIRED_CODES.has(result.code)
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function slaDisplayLabel(prospecto: Prospecto): string {
  if (prospecto.fase === "prospecto_nuevo") {
    const hours = Math.floor(
      (Date.now() - new Date(prospecto.faseChangedAt).getTime()) / 3_600_000
    )
    return `${hours}h en fase`
  }
  return `${prospecto.diasEnFase}d en fase`
}
