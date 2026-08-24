export type CalendarioEventoTipo = "evento" | "vacaciones" | "ausencia" | "reunion"

export interface CalendarioEvento {
  id: string
  titulo: string
  descripcion?: string
  tipo: CalendarioEventoTipo
  fechaInicio: string
  fechaFin: string
  todoElDia: boolean
  usuarioId: string
  creadoEn: string
}

export interface CreateCalendarioEventoInput {
  titulo: string
  descripcion?: string
  tipo: CalendarioEventoTipo
  fechaInicio: string
  fechaFin: string
  todoElDia: boolean
  usuarioId: string
}

export type UpdateCalendarioEventoInput = Partial<CreateCalendarioEventoInput>
