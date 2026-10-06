import type { Client, ClienteEstado, ClienteTipo } from "@/types/client"

export type ClientesCreateRole = "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"

export function shouldPickComercialOnClientCreate(role: ClientesCreateRole): boolean {
  return role === "superadmin" || role === "tramitacion"
}

export function defaultComercialIdForClientCreate(
  role: ClientesCreateRole,
  activeUserId: string,
  comercialOptionIds: string[]
): string {
  if (!shouldPickComercialOnClientCreate(role)) return activeUserId
  if (comercialOptionIds.includes(activeUserId)) return activeUserId
  return comercialOptionIds[0] ?? ""
}

export interface ClientesCreateFormState {
  tipoCliente: ClienteTipo
  nombre: string
  apellidos: string
  documento: string
  telefono: string
  email: string
  provincia: string
  ciudad: string
  codigoPostal: string
  estado: ClienteEstado
  rgpdAccepted: boolean
  notas: string
  comercialId: string
}

export function emptyClientesCreateForm(defaultComercialId: string): ClientesCreateFormState {
  return {
    tipoCliente: "particular",
    nombre: "",
    apellidos: "",
    documento: "",
    telefono: "",
    email: "",
    provincia: "",
    ciudad: "",
    codigoPostal: "",
    estado: "pendiente",
    rgpdAccepted: false,
    notas: "",
    comercialId: defaultComercialId,
  }
}

export function validateClientesCreateForm(
  form: ClientesCreateFormState,
  role: ClientesCreateRole
): string | null {
  if (!form.nombre.trim()) {
    return form.tipoCliente === "empresa" ? "Indica la razón social." : "Indica el nombre del cliente."
  }
  if (shouldPickComercialOnClientCreate(role) && !form.comercialId.trim()) {
    return "Selecciona el comercial responsable."
  }
  if (!shouldPickComercialOnClientCreate(role) && !form.comercialId.trim()) {
    return "No se pudo asignar el comercial del cliente."
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "El email no es válido."
  }
  return null
}

export function buildClientFromCreateForm(form: ClientesCreateFormState): Client {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: `cli-${Date.now()}`,
    nombre: form.nombre.trim(),
    apellidos: form.apellidos.trim() || undefined,
    estado: form.estado,
    documento: form.documento.trim() || undefined,
    telefono: form.telefono.trim() || undefined,
    email: form.email.trim() || undefined,
    provincia: form.provincia.trim() || undefined,
    ciudad: form.ciudad.trim() || undefined,
    codigoPostal: form.codigoPostal.trim() || undefined,
    tipoCliente: form.tipoCliente,
    comercialId: form.comercialId,
    archivos: [],
    createdAt: today,
    rgpdAccepted: form.rgpdAccepted,
    source: "manual",
    notas: form.notas.trim() || undefined,
  }
}
