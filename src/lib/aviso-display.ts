import type { AvisoTipo } from "@/types/aviso"

export const AVISO_TIPO_OPTIONS: { value: AvisoTipo; label: string; hint: string }[] = [
  {
    value: "general",
    label: "General",
    hint: "Anuncios, horarios y comunicación interna del día a día",
  },
  {
    value: "comercial",
    label: "Operativa comercial",
    hint: "Tarifas, comparador, campañas y objetivos de venta",
  },
  {
    value: "tramitacion",
    label: "Tramitación y contratos",
    hint: "Activaciones, documentación, altas en comercializadora y CNMC",
  },
  {
    value: "liquidaciones",
    label: "Liquidaciones y comisiones",
    hint: "Plazos de cobro, autofacturas y retrocomisiones",
  },
  {
    value: "urgente",
    label: "Urgente / incidencia",
    hint: "SLA crítico, caídas de servicio o plazos regulatorios inmediatos",
  },
]

export const AVISO_TIPO_SORT_ORDER: Record<AvisoTipo, number> = {
  urgente: 0,
  liquidaciones: 1,
  tramitacion: 2,
  comercial: 3,
  general: 4,
}

const LEGACY_TIPO_MAP: Record<string, AvisoTipo> = {
  info: "general",
  importante: "comercial",
  urgente: "urgente",
}

export function normalizeAvisoTipo(value: string | undefined): AvisoTipo {
  if (!value) return "general"
  if (value in AVISO_TIPO_SORT_ORDER) return value as AvisoTipo
  return LEGACY_TIPO_MAP[value] ?? "general"
}

export function avisoTipoLabel(tipo: AvisoTipo): string {
  return AVISO_TIPO_OPTIONS.find((option) => option.value === tipo)?.label ?? tipo
}

export function avisoTipoBadgeClass(tipo: AvisoTipo): string {
  if (tipo === "urgente") return "bg-red-500/15 text-red-600 dark:text-red-400"
  if (tipo === "liquidaciones") return "bg-violet-500/15 text-violet-700 dark:text-violet-400"
  if (tipo === "tramitacion") return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  if (tipo === "comercial") return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400"
  return "bg-sky-500/15 text-sky-700 dark:text-sky-400"
}

export function staffRoleLabel(role: string): string {
  if (role === "jefe_comercial") return "Director Comercial"
  if (role === "comercial") return "Comercial"
  if (role === "tramitacion") return "Tramitación"
  if (role === "superadmin") return "Superadmin"
  return role
}
