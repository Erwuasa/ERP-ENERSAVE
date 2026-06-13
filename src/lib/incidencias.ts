export type IncidenciaEstado = "pendiente" | "resuelta" | "cancelada"

export type IncidenciaTipo =
  | "Tarifa Incorrecta"
  | "Retraso de Firma"
  | "Error de CUPS"
  | "Reclamación Distribuidora"
  | "Incidencia Cartera"

export interface IncidenciaTicket {
  id: string
  clientName: string
  tipo: IncidenciaTipo
  prioridad: "alta" | "media" | "baja"
  estado: IncidenciaEstado
  comercialId: string
  comercialName: string
  descripcion: string
  createdAt?: string
  estadoAt?: string
}

const TERMINAL_ESTADO_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000

export function isIncidenciaKanbanVisible(
  inc: IncidenciaTicket,
  referenceDate?: Date
): boolean {
  const ref = referenceDate instanceof Date ? referenceDate : new Date()
  if (inc.estado === "pendiente") return true
  if (!inc.estadoAt) return true
  return ref.getTime() - new Date(inc.estadoAt).getTime() <= TERMINAL_ESTADO_VISIBLE_MS
}

export function withIncidenciaEstado(
  inc: IncidenciaTicket,
  estado: IncidenciaEstado
): IncidenciaTicket {
  if (estado === "pendiente") {
    return { ...inc, estado, estadoAt: undefined }
  }
  return {
    ...inc,
    estado,
    estadoAt:
      inc.estado === estado && inc.estadoAt
        ? inc.estadoAt
        : new Date().toISOString(),
  }
}
