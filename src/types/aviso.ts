export type AvisoTipo = "info" | "importante" | "urgente"
export type AvisoFrecuencia = "diaria" | "semanal" | "puntual"

export interface Aviso {
  id: string
  titulo: string
  contenido: string
  tipo: AvisoTipo
  frecuencia: AvisoFrecuencia
  publicadoPor: string
  publicadoEn: string
  vistoPor: string[]
}

export interface CreateAvisoInput {
  titulo: string
  contenido: string
  tipo: AvisoTipo
  frecuencia: AvisoFrecuencia
  publicadoPor: string
}
