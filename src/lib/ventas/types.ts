export type ProspectoFase =
  | "prospecto_nuevo"
  | "contactado"
  | "cualificado"
  | "propuesta_enviada"
  | "negociacion"
  | "documentacion"
  | "enviado"
  | "cliente_activo"
  | "recontactar"
  | "descartado"

export type ActividadTipo =
  | "llamada"
  | "visita"
  | "email"
  | "whatsapp"
  | "nota"
  | "cambio_fase"
  | "documento"
  | "propuesta_enviada"
  | "contrato_creado"

export type TareaTipo =
  | "primer_contacto"
  | "llamada_seguimiento"
  | "enviar_propuesta"
  | "recoger_documentacion"
  | "verificar_alta"
  | "recontacto_programado"
  | "encuesta_satisfaccion"

export type TareaEstado = "pendiente" | "completada" | "descartada"
export type TareaPrioridad = "alta" | "media" | "baja"

export interface Prospecto {
  id: string
  comercialId: string
  comercialName: string
  nombre: string
  telefono?: string
  email?: string
  nif?: string
  fase: ProspectoFase
  faseChangedAt: string
  diasEnFase: number
  motivoDescarte?: string
  contratoEquipoId?: string
  cups?: string
  tipoSuministro?: "luz" | "gas"
  consumoAnualKwh?: number
  companiaActual?: string
  vencimientoPermanencia?: string
  tarifaActual?: string
  propuestaCompania?: string
  propuestaTarifa?: string
  propuestaNotas?: string
  direccion?: string
  codigoPostal?: string
  poblacion?: string
  provincia?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ActividadVenta {
  id: string
  prospectoId: string
  comercialId: string
  comercialName?: string
  tipo: ActividadTipo
  titulo?: string
  descripcion?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface TareaVenta {
  id: string
  prospectoId: string
  comercialId: string
  tipo: TareaTipo
  estado: TareaEstado
  prioridad: TareaPrioridad
  fechaObjetivo?: string
  titulo?: string
  notas?: string
  completadaAt?: string
  origenFase?: ProspectoFase
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateProspectoInput {
  nombre: string
  comercialId: string
  comercialName: string
  telefono?: string
  email?: string
  nif?: string
  fase?: ProspectoFase
  cups?: string
  tipoSuministro?: "luz" | "gas"
  consumoAnualKwh?: number
  companiaActual?: string
  vencimientoPermanencia?: string
  tarifaActual?: string
  propuestaCompania?: string
  propuestaTarifa?: string
  propuestaNotas?: string
  direccion?: string
  codigoPostal?: string
  poblacion?: string
  provincia?: string
  metadata?: Record<string, unknown>
}

export interface UpdateProspectoPatch {
  nombre?: string
  telefono?: string
  email?: string
  nif?: string
  cups?: string
  tipoSuministro?: "luz" | "gas"
  consumoAnualKwh?: number
  companiaActual?: string
  vencimientoPermanencia?: string
  tarifaActual?: string
  propuestaCompania?: string
  propuestaTarifa?: string
  propuestaNotas?: string
  direccion?: string
  codigoPostal?: string
  poblacion?: string
  provincia?: string
  contratoEquipoId?: string
  metadata?: Record<string, unknown>
}

export interface CreateActividadInput {
  prospectoId: string
  comercialId: string
  comercialName?: string
  tipo: Exclude<ActividadTipo, "cambio_fase" | "contrato_creado">
  titulo?: string
  descripcion?: string
  metadata?: Record<string, unknown>
}

export interface CreateTareaInput {
  prospectoId: string
  comercialId: string
  tipo: TareaTipo
  prioridad?: TareaPrioridad
  fechaObjetivo?: string
  titulo?: string
  notas?: string
  origenFase?: ProspectoFase
  metadata?: Record<string, unknown>
}

export interface UpdateTareaPatch {
  estado?: TareaEstado
  prioridad?: TareaPrioridad
  fechaObjetivo?: string
  titulo?: string
  notas?: string
  completadaAt?: string
  metadata?: Record<string, unknown>
}

export interface ListProspectosFilters {
  comercialId?: string
  fase?: ProspectoFase
}

export interface ListTareasFilters {
  estado?: TareaEstado
  fechaDesde?: string
}
