export type GeneralDatabaseSegment = "residencial" | "pyme" | "comunidades"

export type GeneralDatabaseLeadSource = "campana" | "web" | "base"

export interface GeneralDatabaseLead {
  id: string
  nombre: string
  sede?: string
  numeroAdmSegSocial?: string
  numeroEmpleados?: number
  cnae?: string
  codigoPostal?: string
  localidad?: string
  provincia?: string
  telefono?: string
  direccionWeb?: string
  codigoIne?: string
  descripcionActividad?: string
  segment: GeneralDatabaseSegment
  source: GeneralDatabaseLeadSource
  createdAt: string
}

export interface GeneralDatabaseFilters {
  search?: string
  segment?: GeneralDatabaseSegment | ""
  empleadosMin?: number
  empleadosMax?: number
  provincia?: string
  localidad?: string
  cnae?: string
  conTelefono?: boolean
  conWeb?: boolean
  soloPrioritarios?: boolean
}
