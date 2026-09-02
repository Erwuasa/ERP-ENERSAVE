import type { ContractEstado } from "../lib/contract-estado"

export interface Contract {
  id: string
  clientId?: string
  clientName: string
  cups: string
  tipo: "luz" | "gas"
  compania: string
  tarifa: string
  consumoAnual: number
  montoInterno: number
  montoExterno: number
  estado: ContractEstado
  /** Fecha en que el estado actual entró en vigor (activación, baja, etc.) */
  estadoEfectivoDesde?: string
  motivoCambioEstado?: string
  comercialId: string
  comercialName: string
  createdAt: string
  fechaBaja?: string
  retrocomisionClawback?: number
  atr?: string
  fechaFin?: string
  estadoRenovacion?: string
  fechaRenovacion?: string
  diasRenovacion?: number
  nif?: string
  telefono?: string
  email?: string
  iban?: string
  direccionCompleta?: string
  direccionSuministro?: string
  potenciaContratada?: string | number
  documentos?: { name: string; size: string; tipo?: string; uploadedAt?: string }[]
  tipoPrecio?: "fijo" | "mercado"
  precioFijoConsumo?: number
  /** Consumo anual (kWh) introducido a mano para el cálculo de penalización */
  consumoAnualManual?: number | null
  tipoCliente?: string
  formaPago?: string
  direccionFiscal?: string
  codigoPostal?: string
  poblacion?: string
  provincia?: string
  nombreComercial?: string
  jefeEquipo?: string
  comentariosInternos?: Array<{
    id: string
    authorRole: string
    authorName: string
    text: string
    createdAt: string
  }>
  marcoEntryId?: string
  source?: "manual" | "at"
  atStatus?: string
  atContractId?: string
}
