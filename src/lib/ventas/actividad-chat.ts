import type { ActividadTipo, ActividadVenta } from "./types"

/** Tipos que aparecen en el chat de reporte del comercial. */
export const CHAT_ACTIVIDAD_TIPOS: readonly ActividadTipo[] = [
  "nota",
  "whatsapp",
  "llamada",
  "visita",
  "email",
  "documento",
]

export const SYSTEM_ACTIVIDAD_TIPOS: readonly ActividadTipo[] = [
  "cambio_fase",
  "propuesta_enviada",
  "contrato_creado",
]

export function isChatActividad(actividad: ActividadVenta): boolean {
  return CHAT_ACTIVIDAD_TIPOS.includes(actividad.tipo)
}

export function isSystemActividad(actividad: ActividadVenta): boolean {
  return SYSTEM_ACTIVIDAD_TIPOS.includes(actividad.tipo)
}

export function sortActividadesForChat(actividades: ActividadVenta[]): ActividadVenta[] {
  return [...actividades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

export function filterTimelineActividades(actividades: ActividadVenta[]): ActividadVenta[] {
  return actividades.filter((a) => isChatActividad(a) || isSystemActividad(a))
}

export function formatChatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getActividadBubbleText(actividad: ActividadVenta): string {
  if (actividad.descripcion?.trim()) return actividad.descripcion.trim()
  if (actividad.titulo?.trim()) return actividad.titulo.trim()
  return "—"
}

export function getSystemActividadLabel(actividad: ActividadVenta): string {
  switch (actividad.tipo) {
    case "cambio_fase":
      return actividad.descripcion ?? actividad.titulo ?? "Cambio de fase"
    case "propuesta_enviada":
      return "Propuesta enviada"
    case "contrato_creado":
      return actividad.descripcion ?? "Contrato creado"
    default:
      return getActividadBubbleText(actividad)
  }
}
