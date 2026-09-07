export interface AutofacturaRecord {
  id: string
  comercialId: string
  comercialName: string
  periodoMes: number
  periodoAnio: number
  settlementIds: string[]
  totalComisionado: number
  generatedAt: string
}

export type AutofacturaGestionEstado = "pendiente" | "procesada"

export interface CreateAutofacturaRecordInput {
  comercialId: string
  comercialName: string
  periodoMes: number
  periodoAnio: number
  settlementIds: string[]
  totalComisionado: number
}
