export type PendingLiquidacionContract = {
  id: string
  code: string
  cups: string
  dateFirm: string
  dateAct: string
  direction: string
  agentId: string
  agentName: string
  brand: string
  tariff: string
  price: number
  checked?: boolean
  clientName: string
  tipo: "luz" | "gas"
}

export type ConsolidatedLiquidacion = {
  id: string
  brand: string
  operator: string
  dateConsolidated: string
  contractsCount: number
  amount: number
  code: string
}

export type LiquidacionesProfile = {
  id: string
  fullName: string
  role: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  managerId?: string | null
  commissionPercentage: number
}

export type LiquidacionesRole = "superadmin" | "tramitacion" | "jefe_comercial" | "comercial"
