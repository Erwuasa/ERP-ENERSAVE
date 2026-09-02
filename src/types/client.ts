export type ClienteTipo = "particular" | "empresa"
export type ClienteEstado = "activo" | "pendiente" | "inactivo"

export interface ClienteArchivo {
  id: string
  name: string
  mimeType: string
  size: number
  /** Base64 data URL para descarga local */
  dataUrl: string
  uploadedAt: string
}

export interface Client {
  id: string
  nombre: string
  apellidos?: string
  estado: ClienteEstado
  documento?: string
  telefono?: string
  email?: string
  direccion?: string
  codigoPostal?: string
  ciudad?: string
  provincia?: string
  esMoroso?: boolean
  tipoCliente: ClienteTipo
  comercialId: string
  archivos: ClienteArchivo[]
  createdAt: string
  rgpdAccepted?: boolean
  source?: "manual" | "at"
  atClientId?: string
  notas?: string
  cups?: string
}
