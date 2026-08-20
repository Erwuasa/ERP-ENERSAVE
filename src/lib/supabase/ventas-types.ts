import type {
  ActividadTipo,
  MotivoDescarte,
  ProspectoFase,
  SubEstadoTramitacion,
  SubtipoProspecto,
  TareaEstado,
  TareaPrioridad,
  TareaTipo,
} from "../ventas/types"

export interface ProspectoRow {
  id: string
  created_at: string
  updated_at: string
  comercial_id: string
  comercial_name: string
  nombre?: string | null
  nombre_negocio?: string | null
  telefono: string | null
  email: string | null
  nif: string | null
  fase: ProspectoFase
  fase_changed_at?: string
  fecha_cambio_fase?: string
  canal_origen?: string | null
  dias_en_fase: number
  subtipo_prospecto: SubtipoProspecto | null
  fecha_proximo_contacto: string | null
  sub_estado: SubEstadoTramitacion | null
  motivo_con_dudas: string | null
  motivo_recontacto: string | null
  fecha_recontactar: string | null
  motivo_descarte: MotivoDescarte | null
  contrato_equipo_id: string | null
  cups: string | null
  tipo_suministro: "luz" | "gas" | null
  consumo_anual_kwh: number | null
  compania_actual: string | null
  vencimiento_permanencia: string | null
  tarifa_actual: string | null
  propuesta_compania: string | null
  propuesta_tarifa: string | null
  propuesta_notas: string | null
  direccion: string | null
  codigo_postal: string | null
  poblacion: string | null
  provincia: string | null
  metadata: Record<string, unknown> | null
}

export interface ActividadVentaRow {
  id: string
  prospecto_id: string
  comercial_id: string
  comercial_name: string | null
  tipo: ActividadTipo
  titulo: string | null
  descripcion: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface TareaVentaRow {
  id: string
  created_at: string
  updated_at: string
  prospecto_id: string
  comercial_id: string
  tipo: TareaTipo
  estado?: TareaEstado
  completada?: boolean
  prioridad: TareaPrioridad
  fecha_objetivo: string | null
  fecha_vencimiento?: string | null
  titulo: string | null
  descripcion?: string | null
  notas: string | null
  completada_at: string | null
  fecha_completada?: string | null
  origen_fase: string | null
  metadata: Record<string, unknown> | null
}
