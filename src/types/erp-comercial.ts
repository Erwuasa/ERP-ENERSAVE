export interface ErpComercial {
  id: string
  fullName: string
  email: string
  commissionPercentage: number
  activo: boolean
  dni: string
  direccion: string
  ciudad: string
  codigoPostal: string
  telefono: string
  iban: string
}

export interface ErpComercialFiscalPatch {
  dni?: string | null
  direccion?: string | null
  ciudad?: string | null
  codigo_postal?: string | null
  telefono?: string | null
  iban?: string | null
}
