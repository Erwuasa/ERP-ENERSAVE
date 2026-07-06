import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
} from "lucide-react"
import type { ActividadTipo } from "../../lib/ventas/types"

const ACTIVIDAD_ICON: Record<ActividadTipo, LucideIcon> = {
  llamada: Phone,
  visita: Building2,
  email: Mail,
  whatsapp: MessageCircle,
  nota: StickyNote,
  cambio_fase: ArrowRight,
  documento: FileText,
  propuesta_enviada: FileText,
  contrato_creado: CheckCircle,
}

const ACTIVIDAD_LABEL: Record<ActividadTipo, string> = {
  llamada: "Llamada",
  visita: "Visita",
  email: "Email",
  whatsapp: "WhatsApp",
  nota: "Nota",
  cambio_fase: "Cambio de fase",
  documento: "Documento",
  propuesta_enviada: "Propuesta enviada",
  contrato_creado: "Contrato creado",
}

export function getActividadIcon(tipo: ActividadTipo): LucideIcon {
  return ACTIVIDAD_ICON[tipo] ?? FileText
}

export function getActividadTipoLabel(tipo: ActividadTipo): string {
  return ACTIVIDAD_LABEL[tipo] ?? tipo
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  })
}
