export type ProspectoFase =
  | "prospecto_nuevo"
  | "contactado"
  | "cualificado"
  | "propuesta_enviada"
  | "negociacion"
  | "tramitacion"
  | "pendiente_firma"
  | "activado"
  | "con_dudas"
  | "descartado"
  | "recontactar"

export type SubtipoProspecto =
  | "base_datos"
  | "vecino_zona"
  | "contacto_previo"
  | "referido"

export type SubEstadoTramitacion =
  | "en_proceso"
  | "incidencia_administrativa"
  | "pendiente_de_firma"

export type MotivoDescarte =
  | "precio_competencia"
  | "no_interesado"
  | "permanencia_activa"
  | "no_es_decisor"
  | "moroso"
  | "sin_respuesta"
  | "consumo_bajo"
  | "ya_es_cliente"
  | "otro"

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
  subtipoProspecto?: SubtipoProspecto
  fechaProximoContacto?: string
  subEstado?: SubEstadoTramitacion
  motivoConDudas?: string
  motivoRecontacto?: string
  fechaRecontactar?: string
  motivoDescarte?: MotivoDescarte
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
  subtipoProspecto?: SubtipoProspecto
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
  subtipoProspecto?: SubtipoProspecto
  fechaProximoContacto?: string
  subEstado?: SubEstadoTramitacion
  motivoConDudas?: string
  motivoRecontacto?: string
  fechaRecontactar?: string
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

export interface UpdateProspectoFaseInput {
  fase: ProspectoFase
  motivoDescarte?: MotivoDescarte
  subtipoProspecto?: SubtipoProspecto
  fechaProximoContacto?: string
  subEstado?: SubEstadoTramitacion
  motivoConDudas?: string
  motivoRecontacto?: string
  fechaRecontactar?: string
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
