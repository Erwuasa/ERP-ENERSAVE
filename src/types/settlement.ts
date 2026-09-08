export type SettlementTipoEvento = "activacion" | "retrocomision" | "mensual" | "ajuste"

export interface Settlement {
  id: string
  comercialId: string
  comercialName: string
  montoInterno: number
  montoExterno: number
  estado: "pendiente" | "pagado"
  tipo: "luz" | "gas"
  descripcion: string
  createdAt: string
  contractId?: string
  tipoEvento?: SettlementTipoEvento
  fechaBaja?: string
  source?: "manual" | "at"
  companyPaymentStatus?: string
  collaboratorPaymentStatus?: string
  manualOverrides?: Record<string, boolean>
}

export type LiquidacionesInternasTab = "totales" | "pendientes" | "retrocomisiones"
