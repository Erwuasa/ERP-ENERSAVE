export type AlegacionEstado = "abierta" | "en_revision" | "resuelta"

export interface AlegacionAdjunto {
  name: string
  dataUrl: string
  size: string
}

export interface AlegacionMensaje {
  id: string
  autorId: string
  autorNombre: string
  texto: string
  /** Solo en memoria del navegador — nunca se persiste en Supabase */
  archivosAdjuntos: AlegacionAdjunto[]
  fecha: string
}

export interface Alegacion {
  id: string
  settlementId: string
  contractId: string
  comercialId: string
  estado: AlegacionEstado
  mensajes: AlegacionMensaje[]
  creadaEn: string
  /** Importe acordado por superadmin; sustituye la comisión en KPIs y tabla */
  comisionAjustada?: number | null
}

export interface CreateAlegacionInput {
  settlementId: string
  contractId: string
  comercialId: string
  mensaje: Omit<AlegacionMensaje, "archivosAdjuntos"> & { numArchivosAdjuntos: number }
}
