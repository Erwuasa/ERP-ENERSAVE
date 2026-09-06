export type AvisoTipo = "general" | "comercial" | "tramitacion" | "liquidaciones" | "urgente"
export type AvisoFrecuencia = "diaria" | "semanal" | "puntual"
export type AvisoDestinatarioTipo = "todos" | "usuario" | "equipo"

export interface Aviso {
  id: string
  titulo: string
  contenido: string
  tipo: AvisoTipo
  frecuencia: AvisoFrecuencia
  publicadoPor: string
  publicadoEn: string
  vistoPor: string[]
  destinatarioTipo: AvisoDestinatarioTipo
  destinatarioIds: string[]
  fechaEnvioProgramada: string | null
}

export interface CreateAvisoInput {
  titulo: string
  contenido: string
  tipo: AvisoTipo
  frecuencia: AvisoFrecuencia
  publicadoPor: string
  destinatarioTipo?: AvisoDestinatarioTipo
  destinatarioIds?: string[]
  fechaEnvioProgramada?: string | null
}
