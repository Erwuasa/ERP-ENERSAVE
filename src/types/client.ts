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
  estado: ClienteEstado
  documento?: string
  telefono?: string
  email?: string
  codigoPostal?: string
  ciudad?: string
  tipoCliente: ClienteTipo
  comercialId: string
  archivos: ClienteArchivo[]
  createdAt: string
}
