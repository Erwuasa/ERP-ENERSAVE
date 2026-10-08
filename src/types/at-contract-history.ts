// Formas de los datos históricos de AT que quedaron guardados en `contratos_equipo` (at_notes,
// at_events, at_documents, at_emails...) antes de retirar el sync en vivo con AT (AGENTS.md §9,
// "congelar con corte limpio"). Viven aquí, en un módulo sin red, porque las pantallas de
// Historial/Incidencias/Documentos solo los muestran — nunca vuelven a pedirlos a AT.

export interface AtContractNote {
  id?: string
  note: string
  createdAt?: string
  authorSide?: string
}

export interface AtContractEvent {
  id?: string
  type?: string
  title?: string
  fromStatus?: string
  toStatus?: string
  actor?: string
  createdAt?: string
}

export interface AtContractDocument {
  id?: string
  name: string
  type?: string
  url?: string
  size?: string
  mime?: string
  createdAt?: string
}

export interface AtContractEmail {
  id?: string
  subject?: string
  to?: string
  status?: string
  createdAt?: string
}

export interface AtContractPrice {
  period: string
  energy?: number
  power?: number
}
