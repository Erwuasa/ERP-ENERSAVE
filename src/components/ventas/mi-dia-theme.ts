/** Tokens de color e iconografía para Mi Día (flat, icon-first). */
export const MI_DIA_KPI_THEME = {
  alertas: {
    iconClass: "text-rose-600 dark:text-rose-400",
    iconBgClass: "bg-rose-500/15",
    borderClass: "border-rose-500/35",
    panelClass: "bg-rose-500/[0.04]",
    valueClass: "text-rose-700 dark:text-rose-300",
    tooltip: "SLA en riesgo y tareas vencidas",
  },
  alertasVencidas: {
    iconClass: "text-orange-600 dark:text-orange-400",
    iconBgClass: "bg-orange-500/15",
    borderClass: "border-orange-500/35",
    panelClass: "bg-orange-500/[0.04]",
    valueClass: "text-orange-700 dark:text-orange-300",
    tooltip: "SLA en riesgo y tareas vencidas",
  },
  objetivos: {
    iconClass: "text-cyan-600 dark:text-cyan-400",
    iconBgClass: "bg-cyan-500/15",
    borderClass: "border-cyan-500/35",
    panelClass: "bg-cyan-500/[0.04]",
    valueClass: "text-cyan-700 dark:text-cyan-300",
    tooltip: "Ver objetivos del mes",
  },
  pipeline: {
    iconClass: "text-violet-600 dark:text-violet-400",
    iconBgClass: "bg-violet-500/15",
    borderClass: "border-violet-500/35",
    panelClass: "bg-violet-500/[0.04]",
    valueClass: "text-violet-700 dark:text-violet-300",
    tooltip: "Abrir pipeline de ventas",
  },
} as const

/** Altura compartida de las tarjetas Pendientes + Objetivos en desktop. */
export const MI_DIA_PAIRED_CARD_CLASS =
  "min-h-[240px] lg:h-[288px] flex flex-col"

export const MI_DIA_SECTION_THEME = {
  tareas: {
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBgClass: "bg-amber-500/15",
    borderClass: "border-amber-500/25",
    tooltip: "Cola de trabajo del día",
  },
  pendientes: {
    iconClass: "text-violet-600 dark:text-violet-400",
    iconBgClass: "bg-violet-500/15",
    borderClass: "border-violet-500/25",
    tooltip: "Abrir pipeline · pendientes por fase",
  },
  objetivos: {
    iconClass: "text-cyan-600 dark:text-cyan-400",
    iconBgClass: "bg-cyan-500/15",
    borderClass: "border-cyan-500/25",
    tooltip: "Progreso mensual de actividad",
  },
  sla: {
    iconClass: "text-rose-600 dark:text-rose-400",
    iconBgClass: "bg-rose-500/15",
    borderClass: "border-rose-500/25",
    tooltip: "Ver todos los avisos SLA",
  },
  activacion: {
    iconClass: "text-emerald-600 dark:text-emerald-400",
    iconBgClass: "bg-emerald-500/15",
    borderClass: "border-emerald-500/25",
    tooltip: "Contratos en tramitación ERP",
  },
  fidelizacion: {
    iconClass: "text-indigo-600 dark:text-indigo-400",
    iconBgClass: "bg-indigo-500/15",
    borderClass: "border-indigo-500/25",
    tooltip: "Clientes activados · revisiones",
  },
  contactos: {
    iconClass: "text-cyan-600 dark:text-cyan-400",
    iconBgClass: "bg-cyan-500/15",
    tooltip: "Contactos realizados este mes",
  },
  propuestas: {
    iconClass: "text-violet-600 dark:text-violet-400",
    iconBgClass: "bg-violet-500/15",
    tooltip: "Propuestas enviadas este mes",
  },
  visitas: {
    iconClass: "text-emerald-600 dark:text-emerald-400",
    iconBgClass: "bg-emerald-500/15",
    tooltip: "Visitas a negocios este mes",
  },
} as const
