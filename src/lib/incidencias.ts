export type LegacyIncidenciaEstado = "pendiente" | "resuelta" | "cancelada"

export type IncidenciaEstado =
  | "sin_categorizar"
  | "abierto"
  | "en_progreso"
  | "resuelto"
  | "cerrado"

export const INCIDENCIA_ESTADOS: IncidenciaEstado[] = [
  "sin_categorizar",
  "abierto",
  "en_progreso",
  "resuelto",
  "cerrado",
]

export type IncidenciaPrioridad = "critica" | "alta" | "media" | "baja"

export type IncidenciaOrigen = "manual" | "comercial" | "sistema" | "cliente"

export type IncidenciaTipo =
  | "Tarifa Incorrecta"
  | "Retraso de Firma"
  | "Error de CUPS"
  | "Reclamación Distribuidora"
  | "Incidencia Cartera"
  | "Riesgo de Seguridad"

export interface IncidenciaEstadoHistorialEntry {
  estado: IncidenciaEstado
  fecha: string
  motivo?: string
  cambiadoPor: string
}

export interface IncidenciaTicket {
  id: string
  codigo: string
  clientName: string
  tipo: IncidenciaTipo
  prioridad?: IncidenciaPrioridad
  estado: IncidenciaEstado
  origen: IncidenciaOrigen
  comercialId: string
  comercialName: string
  descripcion: string
  asignadoA?: string
  canal?: string
  createdAt?: string
  estadoAt?: string
  historialEstados: IncidenciaEstadoHistorialEntry[]
  source?: "manual" | "at"
  atIncidentId?: string
}

export function todayInputDate(referenceDate?: Date): string {
  const ref = referenceDate instanceof Date ? referenceDate : new Date()
  return ref.toISOString().slice(0, 10)
}

const TERMINAL_ESTADO_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000

const NON_TERMINAL_ESTADOS: IncidenciaEstado[] = [
  "sin_categorizar",
  "abierto",
  "en_progreso",
]

export function migrateLegacyEstado(estado: string): IncidenciaEstado {
  if (estado === "pendiente") return "abierto"
  if (estado === "resuelta") return "resuelto"
  if (estado === "cancelada") return "cerrado"
  if (INCIDENCIA_ESTADOS.includes(estado as IncidenciaEstado)) {
    return estado as IncidenciaEstado
  }
  return "abierto"
}

export function normalizeIncidenciaTicket(
  inc: Omit<IncidenciaTicket, "estado" | "codigo" | "origen" | "historialEstados"> & {
    estado: string
    codigo?: string
    origen?: IncidenciaOrigen
    historialEstados?: IncidenciaEstadoHistorialEntry[]
  }
): IncidenciaTicket {
  return {
    ...inc,
    codigo: inc.codigo ?? generateIncidenciaCodigoFromId(inc.id),
    origen: inc.origen ?? "comercial",
    estado: migrateLegacyEstado(inc.estado),
    historialEstados: inc.historialEstados ?? [],
  }
}

export function generateIncidenciaCodigoFromId(id: string): string {
  const digits = id.replace(/\D/g, "")
  const num = digits ? Number(digits) : Date.now()
  return `INC-${String(num).padStart(4, "0").slice(-4)}`
}

export function generateIncidenciaCodigo(existing: IncidenciaTicket[]): string {
  const max = existing.reduce((acc, inc) => {
    const match = inc.codigo.match(/INC-(\d+)/i)
    if (!match) return acc
    return Math.max(acc, Number(match[1]))
  }, 0)
  return `INC-${String(max + 1).padStart(4, "0")}`
}

export function isIncidenciaAbierta(estado: IncidenciaEstado): boolean {
  return NON_TERMINAL_ESTADOS.includes(estado)
}

export function isIncidenciaKanbanVisible(
  inc: IncidenciaTicket,
  referenceDate?: Date
): boolean {
  const ref = referenceDate instanceof Date ? referenceDate : new Date()
  if (isIncidenciaAbierta(inc.estado)) return true
  if (!inc.estadoAt) return true
  return ref.getTime() - new Date(inc.estadoAt).getTime() <= TERMINAL_ESTADO_VISIBLE_MS
}

export function withIncidenciaEstado(
  inc: IncidenciaTicket,
  estado: IncidenciaEstado,
  effectiveDate?: string
): IncidenciaTicket {
  if (isIncidenciaAbierta(estado)) {
    return { ...inc, estado, estadoAt: undefined }
  }
  const fecha = effectiveDate ?? todayInputDate()
  const estadoAtFromDate = new Date(`${fecha}T12:00:00.000Z`).toISOString()
  return {
    ...inc,
    estado,
    estadoAt:
      inc.estado === estado && inc.estadoAt && !effectiveDate
        ? inc.estadoAt
        : estadoAtFromDate,
  }
}

export function appendIncidenciaEstadoHistorial(
  inc: IncidenciaTicket,
  estado: IncidenciaEstado,
  cambiadoPor: string,
  fecha: string,
  motivo?: string
): IncidenciaTicket {
  const entry: IncidenciaEstadoHistorialEntry = {
    estado,
    fecha,
    cambiadoPor,
    ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
  }
  const historialEstados = [...(inc.historialEstados ?? []), entry]
  return {
    ...withIncidenciaEstado(inc, estado, fecha),
    historialEstados,
  }
}

export function getPrioridadFilterKey(
  prioridad: IncidenciaPrioridad | undefined
): "sin_categorizar" | IncidenciaPrioridad {
  if (!prioridad) return "sin_categorizar"
  return prioridad
}
