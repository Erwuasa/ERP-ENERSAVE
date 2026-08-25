import {
  INCIDENCIA_ESTADOS,
  type IncidenciaEstado,
  type IncidenciaOrigen,
  type IncidenciaTicket,
  type IncidenciaTipo,
} from "@/lib/incidencias"

export type { IncidenciaEstado, IncidenciaTicket, IncidenciaTipo }

export const KANBAN_COLUMNS: {
  id: IncidenciaEstado
  label: string
  borderTop: string
  headerBg: string
}[] = [
  {
    id: "sin_categorizar",
    label: "Sin categorizar",
    borderTop: "border-t-slate-400",
    headerBg: "bg-slate-500/5",
  },
  {
    id: "abierto",
    label: "Abierto",
    borderTop: "border-t-blue-500",
    headerBg: "bg-blue-500/5",
  },
  {
    id: "en_progreso",
    label: "En progreso",
    borderTop: "border-t-violet-500",
    headerBg: "bg-violet-500/5",
  },
  {
    id: "resuelto",
    label: "Resuelto",
    borderTop: "border-t-emerald-500",
    headerBg: "bg-emerald-500/5",
  },
  {
    id: "cerrado",
    label: "Cerrado",
    borderTop: "border-t-slate-600",
    headerBg: "bg-slate-600/5",
  },
]

export const TIPO_OPTIONS: IncidenciaTipo[] = [
  "Incidencia Cartera",
  "Tarifa Incorrecta",
  "Retraso de Firma",
  "Error de CUPS",
  "Reclamación Distribuidora",
]

export const ORIGEN_OPTIONS: IncidenciaOrigen[] = ["manual", "comercial", "sistema", "cliente"]

export const ESTADO_LABELS: Record<IncidenciaEstado, string> = {
  sin_categorizar: "Sin categorizar",
  abierto: "Abierto",
  en_progreso: "En progreso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
}

export { INCIDENCIA_ESTADOS }

export function prioridadBadgeClass(prioridad: IncidenciaTicket["prioridad"]) {
  if (prioridad === "critica") return "bg-rose-600/15 text-rose-600 dark:text-rose-400"
  if (prioridad === "alta") return "bg-orange-500/15 text-orange-600 dark:text-orange-400"
  if (prioridad === "media") return "bg-amber-500/15 text-amber-600 dark:text-amber-500"
  if (prioridad === "baja") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  return "bg-slate-500/10 text-slate-500"
}

export function prioridadLabel(prioridad: IncidenciaTicket["prioridad"]) {
  if (!prioridad) return "Sin cat."
  if (prioridad === "critica") return "Crítica"
  return prioridad.charAt(0).toUpperCase() + prioridad.slice(1)
}
