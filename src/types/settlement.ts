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
}

export type LiquidacionesInternasTab = "totales" | "pendientes" | "retrocomisiones"
