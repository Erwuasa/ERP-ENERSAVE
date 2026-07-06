import type { LucideIcon } from "lucide-react"
import {
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  RefreshCw,
  Send,
} from "lucide-react"
import { countSlaRiskProspectos } from "../../lib/ventas/sla-alerts"
import type { Prospecto, TareaTipo, TareaVenta } from "../../lib/ventas/types"

export function getSaludo(hour: number): string {
  if (hour < 14) return "Buenos días"
  return "Buenas tardes"
}

export function formatMiDiaDate(date: Date = new Date()): string {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function countSlaCritico(prospectos: Prospecto[]): number {
  return countSlaRiskProspectos(prospectos).breach
}

const TAREA_TIPO_ICONS: Record<TareaTipo, LucideIcon> = {
  primer_contacto: Phone,
  llamada_seguimiento: Phone,
  enviar_propuesta: Send,
  recoger_documentacion: FileText,
  verificar_alta: CheckCircle2,
  recontacto_programado: RefreshCw,
  encuesta_satisfaccion: Mail,
}

export function getTareaTipoIcon(tipo: TareaTipo): LucideIcon {
  return TAREA_TIPO_ICONS[tipo] ?? Phone
}

export function getTareaDescripcion(tarea: TareaVenta): string {
  if (tarea.titulo?.trim()) return tarea.titulo.trim()
  return tarea.tipo.replace(/_/g, " ")
}

export function findProspectosSinTarea(
  prospectos: Prospecto[],
  tareas: TareaVenta[]
): Prospecto[] {
  const pendienteByProspecto = new Set(
    tareas.filter((t) => t.estado === "pendiente").map((t) => t.prospectoId)
  )
  return prospectos.filter(
    (p) => p.fase === "prospecto_nuevo" && !pendienteByProspecto.has(p.id)
  )
}
