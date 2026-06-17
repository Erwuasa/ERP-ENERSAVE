import type {
  CreateTareaInput,
  Prospecto,
  ProspectoFase,
  TareaPrioridad,
  TareaTipo,
  TareaVenta,
} from "./types"

export interface QuickWinRule {
  tipo: TareaTipo
  prioridad: TareaPrioridad
  titulo: string
  daysUntilObjective?: number
  useFechaProximoContacto?: boolean
  useFechaRecontactar?: boolean
}

/** Reglas de tareas automáticas al entrar en cada fase destino (TASK-01) */
export const QUICK_WIN_RULES: Record<ProspectoFase, readonly QuickWinRule[]> = {
  prospecto_nuevo: [
    {
      tipo: "primer_contacto",
      prioridad: "alta",
      titulo: "Primer contacto",
      daysUntilObjective: 0,
    },
  ],
  contactado: [
    {
      tipo: "llamada_seguimiento",
      prioridad: "media",
      titulo: "Llamada de seguimiento",
      useFechaProximoContacto: true,
    },
  ],
  cualificado: [
    {
      tipo: "enviar_propuesta",
      prioridad: "alta",
      titulo: "Enviar propuesta",
      daysUntilObjective: 1,
    },
  ],
  propuesta_enviada: [
    {
      tipo: "llamada_seguimiento",
      prioridad: "media",
      titulo: "Seguimiento de propuesta",
      daysUntilObjective: 2,
    },
  ],
  negociacion: [
    {
      tipo: "recoger_documentacion",
      prioridad: "alta",
      titulo: "Recoger documentación",
      daysUntilObjective: 2,
    },
  ],
  tramitacion: [
    {
      tipo: "recoger_documentacion",
      prioridad: "media",
      titulo: "Completar tramitación",
      daysUntilObjective: 3,
    },
  ],
  pendiente_firma: [
    {
      tipo: "llamada_seguimiento",
      prioridad: "alta",
      titulo: "Seguimiento de firma",
      daysUntilObjective: 1,
    },
  ],
  activado: [
    {
      tipo: "verificar_alta",
      prioridad: "media",
      titulo: "Verificar alta",
      daysUntilObjective: 5,
    },
    {
      tipo: "encuesta_satisfaccion",
      prioridad: "baja",
      titulo: "Encuesta de satisfacción",
      daysUntilObjective: 30,
    },
  ],
  con_dudas: [
    {
      tipo: "llamada_seguimiento",
      prioridad: "alta",
      titulo: "Resolver dudas",
      daysUntilObjective: 1,
    },
  ],
  recontactar: [
    {
      tipo: "recontacto_programado",
      prioridad: "alta",
      titulo: "Recontactar prospecto",
      useFechaRecontactar: true,
    },
  ],
  descartado: [],
}

function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function resolveFechaObjetivo(
  rule: QuickWinRule,
  prospecto: Prospecto,
  referenceDate: Date
): string | undefined {
  if (rule.useFechaProximoContacto && prospecto.fechaProximoContacto) {
    return prospecto.fechaProximoContacto
  }
  if (rule.useFechaRecontactar && prospecto.fechaRecontactar) {
    return prospecto.fechaRecontactar
  }
  if (rule.daysUntilObjective != null) {
    return addDays(referenceDate, rule.daysUntilObjective)
  }
  return undefined
}

/** Dedup: skip if pending task with same prospecto + origen_fase + tipo (TASK-02) */
export function shouldCreateQuickWinTask(
  existing: TareaVenta[],
  prospectoId: string,
  origenFase: ProspectoFase,
  tipo: TareaTipo
): boolean {
  return !existing.some(
    (t) =>
      t.prospectoId === prospectoId &&
      t.origenFase === origenFase &&
      t.tipo === tipo &&
      t.estado === "pendiente"
  )
}

export function buildQuickWinTasks(
  prospecto: Prospecto,
  targetFase: ProspectoFase,
  existingTareas: TareaVenta[],
  referenceDate: Date = new Date()
): CreateTareaInput[] {
  const rules = QUICK_WIN_RULES[targetFase]
  const inputs: CreateTareaInput[] = []

  for (const rule of rules) {
    if (!shouldCreateQuickWinTask(existingTareas, prospecto.id, targetFase, rule.tipo)) {
      continue
    }
    inputs.push({
      prospectoId: prospecto.id,
      comercialId: prospecto.comercialId,
      tipo: rule.tipo,
      prioridad: rule.prioridad,
      titulo: rule.titulo,
      fechaObjetivo: resolveFechaObjetivo(rule, prospecto, referenceDate),
      origenFase: targetFase,
    })
  }

  return inputs
}

export type TareaUrgenciaGrupo = "hoy" | "esta_semana" | "mas_tarde"

export function groupTareasByUrgencia(
  tareas: TareaVenta[],
  referenceDate: Date = new Date()
): Record<TareaUrgenciaGrupo, TareaVenta[]> {
  const pendientes = tareas.filter((t) => t.estado === "pendiente")
  const startOfToday = new Date(referenceDate)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfToday)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const groups: Record<TareaUrgenciaGrupo, TareaVenta[]> = {
    hoy: [],
    esta_semana: [],
    mas_tarde: [],
  }

  for (const tarea of pendientes) {
    if (!tarea.fechaObjetivo) {
      groups.hoy.push(tarea)
      continue
    }
    const target = new Date(tarea.fechaObjetivo)
    if (target <= endOfWeek) {
      if (target < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)) {
        groups.hoy.push(tarea)
      } else {
        groups.esta_semana.push(tarea)
      }
    } else {
      groups.mas_tarde.push(tarea)
    }
  }

  return groups
}

export function countTareasPendientes(tareas: TareaVenta[]): number {
  return tareas.filter((t) => t.estado === "pendiente").length
}

export function countTareasCompletadasHoy(
  tareas: TareaVenta[],
  referenceDate: Date = new Date()
): number {
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  return tareas.filter(
    (t) =>
      t.estado === "completada" &&
      t.completadaAt &&
      new Date(t.completadaAt) >= start
  ).length
}
