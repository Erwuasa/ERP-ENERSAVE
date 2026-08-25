import { FUNNEL_ORDER, getFaseConfig, getSlaUrgencia, isTerminalFase } from "./pipeline"
import { groupTareasForMiDia } from "./mi-dia-grouping"
import { groupTareasByUrgencia } from "./quick-wins"
import { getOperationalTasksForProspecto } from "./stage-gate"
import type { Prospecto, TareaVenta } from "./types"

export type FidelizacionCadenciaMeses = 1 | 2 | 3

export interface NextBestAction {
  id: string
  kind: "sla" | "task"
  prospectoId: string
  prospecto: Prospecto
  tareaId?: string
  title: string
  subtitle: string
  isCritical: boolean
}

export interface ContratoActivacionRow {
  id: string
  cliente: string
  cups: string
  estadoErp: "Tramitando" | "Activado"
  estadoRaw: string
  updatedAt: string
}

export interface FidelizacionRow {
  id: string
  prospectoId?: string
  cliente: string
  contratoId: string
  proximoContacto: string
  frecuenciaMeses: FidelizacionCadenciaMeses
}

export interface ContractActivacionSource {
  id: string
  clientName: string
  cups: string
  estado: string
  comercialId: string
  createdAt: string
}

function mapEstadoToDisplay(estado: string): "Tramitando" | "Activado" | null {
  const e = estado.toUpperCase()
  if (e === "ACTIVADO") return "Activado"
  if (
    e === "TRAMITANDO" ||
    e === "PTE DE TRAMITACIÓN" ||
    e === "PTE DE FIRMA" ||
    e === "INCIDENCIA ADMINISTRATIVA"
  ) {
    return "Tramitando"
  }
  return null
}

export function buildContratosActivacion(
  contracts: ContractActivacionSource[],
  comercialId: string
): ContratoActivacionRow[] {
  return contracts
    .filter((c) => c.comercialId === comercialId)
    .map((c) => {
      const display = mapEstadoToDisplay(c.estado)
      if (!display) return null
      return {
        id: c.id,
        cliente: c.clientName,
        cups: c.cups,
        estadoErp: display,
        estadoRaw: c.estado,
        updatedAt: c.createdAt,
      }
    })
    .filter((r): r is ContratoActivacionRow => r !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function buildSimulatedContratosActivacion(
  prospectos: Prospecto[],
  comercialId: string,
  options?: { demo?: boolean }
): ContratoActivacionRow[] {
  const simulated: ContratoActivacionRow[] = []
  const tramitacion = prospectos.filter(
    (p) =>
      p.comercialId === comercialId &&
      (p.fase === "tramitacion" || p.fase === "pendiente_firma")
  )

  for (const p of tramitacion.slice(0, 4)) {
    simulated.push({
      id: `sim-tram-${p.id}`,
      cliente: p.nombre,
      cups: p.cups ?? "—",
      estadoErp: "Tramitando",
      estadoRaw: "TRAMITANDO",
      updatedAt: p.updatedAt,
    })
  }

  const activados = prospectos.filter(
    (p) => p.comercialId === comercialId && p.fase === "activado"
  )
  for (const p of activados.slice(0, 2)) {
    simulated.push({
      id: `sim-act-${p.id}`,
      cliente: p.nombre,
      cups: p.cups ?? "—",
      estadoErp: "Activado",
      estadoRaw: "ACTIVADO",
      updatedAt: p.updatedAt,
    })
  }

  if (simulated.length > 0) return simulated

  if (!options?.demo) return []

  return [
    {
      id: "demo-1",
      cliente: "Ferretería García SL",
      cups: "ES0021000555000001",
      estadoErp: "Tramitando",
      estadoRaw: "TRAMITANDO",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-2",
      cliente: "Panadería López",
      cups: "ES0021000555000002",
      estadoErp: "Activado",
      estadoRaw: "ACTIVADO",
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]
}

export function buildFidelizacionRows(
  contracts: ContractActivacionSource[],
  comercialId: string,
  prospectos: Prospecto[]
): FidelizacionRow[] {
  const activados = contracts.filter(
    (c) =>
      c.comercialId === comercialId &&
      c.estado.toUpperCase() === "ACTIVADO"
  )

  if (activados.length > 0) {
    return activados.map((c, i) => {
      const linked = prospectos.find(
        (p) => p.nombre === c.clientName || p.cups === c.cups
      )
      const frecuencia = ((i % 3) + 1) as FidelizacionCadenciaMeses
      const proximo = new Date()
      proximo.setDate(proximo.getDate() - (i % 2))
      return {
        id: `fid-${c.id}`,
        prospectoId: linked?.id,
        cliente: c.clientName,
        contratoId: c.id,
        proximoContacto: proximo.toISOString(),
        frecuenciaMeses: frecuencia,
      }
    })
  }

  const fromProspectos = prospectos
    .filter((p) => p.comercialId === comercialId && p.fase === "activado")
    .slice(0, 5)
    .map((p, i) => {
      const frecuencia = ((i % 3) + 1) as FidelizacionCadenciaMeses
      const proximo = new Date()
      proximo.setDate(proximo.getDate() - i)
      return {
        id: `fid-prosp-${p.id}`,
        prospectoId: p.id,
        cliente: p.nombre,
        contratoId: p.contratoEquipoId ?? `ctr-${p.id}`,
        proximoContacto: proximo.toISOString(),
        frecuenciaMeses: frecuencia,
      }
    })

  if (fromProspectos.length > 0) return fromProspectos

  return []
}

function shortTaskLabel(tarea: TareaVenta): string {
  return tarea.titulo?.trim() || tarea.tipo.replace(/_/g, " ")
}

export type MiDiaQuickActionKind = "tarea" | "checklist"

export interface MiDiaQuickAction {
  id: string
  kind: MiDiaQuickActionKind
  prospectoId: string
  prospecto: Prospecto
  tareaId?: string
  taskLabel: string
  faseLabel: string
  urgency: "overdue" | "today" | "week" | "later" | "fase"
}

const URGENCY_RANK: Record<MiDiaQuickAction["urgency"], number> = {
  overdue: 0,
  today: 1,
  fase: 2,
  week: 3,
  later: 4,
}

export type ProspectoSlaUrgencia = "breach" | "warning" | "ok"

export function getProspectoSlaUrgencia(prospecto: Prospecto): ProspectoSlaUrgencia {
  const u = getSlaUrgencia({
    fase: prospecto.fase,
    faseChangedAt: prospecto.faseChangedAt,
    diasEnFase: prospecto.diasEnFase,
    fechaProximoContacto: prospecto.fechaProximoContacto,
    metadata: prospecto.metadata,
    subtipoProspecto: prospecto.subtipoProspecto,
  })
  if (u === "breach") return "breach"
  if (u === "warning") return "warning"
  return "ok"
}

function slaSortRank(prospecto: Prospecto): number {
  const u = getProspectoSlaUrgencia(prospecto)
  if (u === "breach") return 0
  if (u === "warning") return 1
  return 2
}

function minActionUrgencyRank(summary: MiDiaProspectoSummary): number {
  return Math.min(...summary.actions.map((a) => URGENCY_RANK[a.urgency]))
}

function compareProspectoSummaries(
  a: MiDiaProspectoSummary,
  b: MiDiaProspectoSummary
): number {
  const slaDiff = slaSortRank(a.prospecto) - slaSortRank(b.prospecto)
  if (slaDiff !== 0) return slaDiff

  const urgDiff = minActionUrgencyRank(a) - minActionUrgencyRank(b)
  if (urgDiff !== 0) return urgDiff

  return a.prospecto.nombre.localeCompare(b.prospecto.nombre, "es")
}

export interface MiDiaProspectoSummary {
  prospectoId: string
  prospecto: Prospecto
  actions: MiDiaQuickAction[]
}

export interface MiDiaFaseGroup {
  fase: Prospecto["fase"]
  faseLabel: string
  totalActions: number
  prospectoSummaries: MiDiaProspectoSummary[]
}

const FASE_SORT_INDEX = new Map(
  FUNNEL_ORDER.map((fase, index) => [fase, index])
)

export function groupMiDiaQuickActionsByFase(actions: MiDiaQuickAction[]): MiDiaFaseGroup[] {
  const byFase = new Map<Prospecto["fase"], Map<string, MiDiaProspectoSummary>>()

  for (const action of actions) {
    const fase = action.prospecto.fase
    const prospectoMap = byFase.get(fase) ?? new Map<string, MiDiaProspectoSummary>()
    const existing = prospectoMap.get(action.prospectoId)
    if (existing) {
      existing.actions.push(action)
    } else {
      prospectoMap.set(action.prospectoId, {
        prospectoId: action.prospectoId,
        prospecto: action.prospecto,
        actions: [action],
      })
    }
    byFase.set(fase, prospectoMap)
  }

  return Array.from(byFase.entries())
    .map(([fase, prospectoMap]) => {
      const prospectoSummaries = Array.from(prospectoMap.values()).sort(compareProspectoSummaries)
      const totalActions = prospectoSummaries.reduce((sum, s) => sum + s.actions.length, 0)
      return {
        fase,
        faseLabel: getFaseConfig(fase).label,
        totalActions,
        prospectoSummaries,
      }
    })
    .sort((a, b) => {
      const worstA = Math.min(...a.prospectoSummaries.map((s) => slaSortRank(s.prospecto)))
      const worstB = Math.min(...b.prospectoSummaries.map((s) => slaSortRank(s.prospecto)))
      if (worstA !== worstB) return worstA - worstB

      const ai = FASE_SORT_INDEX.get(a.fase) ?? 999
      const bi = FASE_SORT_INDEX.get(b.fase) ?? 999
      if (ai !== bi) return ai - bi
      return a.faseLabel.localeCompare(b.faseLabel, "es")
    })
}

export function buildMiDiaQuickActions(
  prospectos: Prospecto[],
  tareas: TareaVenta[],
  options?: { comercialId?: string }
): MiDiaQuickAction[] {
  const scopedProspectos = options?.comercialId
    ? prospectos.filter((p) => p.comercialId === options.comercialId)
    : prospectos
  const prospectosById = new Map(scopedProspectos.map((p) => [p.id, p]))
  const items: MiDiaQuickAction[] = []

  const pendientes = tareas.filter(
    (t) => t.estado === "pendiente" && prospectosById.has(t.prospectoId)
  )
  const grupos = groupTareasForMiDia(tareas)
  const urgencia = groupTareasByUrgencia(pendientes)

  const orderedTareas = [
    ...grupos.vencidas,
    ...grupos.hoy,
    ...grupos.esta_semana,
    ...urgencia.mas_tarde,
  ]

  for (const tarea of orderedTareas) {
    const prospecto = prospectosById.get(tarea.prospectoId)
    if (!prospecto) continue

    let taskUrgency: MiDiaQuickAction["urgency"] = "later"
    if (grupos.vencidas.includes(tarea)) taskUrgency = "overdue"
    else if (grupos.hoy.includes(tarea)) taskUrgency = "today"
    else if (grupos.esta_semana.includes(tarea)) taskUrgency = "week"

    items.push({
      id: `tarea-${tarea.id}`,
      kind: "tarea",
      prospectoId: prospecto.id,
      prospecto,
      tareaId: tarea.id,
      taskLabel: shortTaskLabel(tarea),
      faseLabel: getFaseConfig(prospecto.fase).label,
      urgency: taskUrgency,
    })
  }

  for (const prospecto of scopedProspectos) {
    if (isTerminalFase(prospecto.fase)) continue

    const pendingChecklist = getOperationalTasksForProspecto(prospecto).filter((t) => !t.done)
    for (const op of pendingChecklist) {
      items.push({
        id: `checklist-${prospecto.id}-${op.id}`,
        kind: "checklist",
        prospectoId: prospecto.id,
        prospecto,
        taskLabel: op.label,
        faseLabel: getFaseConfig(prospecto.fase).label,
        urgency: "fase",
      })
    }
  }

  return items.sort((a, b) => {
    const slaDiff = slaSortRank(a.prospecto) - slaSortRank(b.prospecto)
    if (slaDiff !== 0) return slaDiff
    const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]
    if (rank !== 0) return rank
    return a.prospecto.nombre.localeCompare(b.prospecto.nombre, "es")
  })
}

function urgentTaskLabel(tarea: TareaVenta, prospecto: Prospecto): string {
  if (prospecto.fase === "pendiente_firma") {
    return `Llamar a ${prospecto.nombre} para firmar en directo`
  }
  if (tarea.tipo === "enviar_propuesta") {
    return `Enviar propuesta a ${prospecto.nombre}`
  }
  if (tarea.tipo === "llamada_seguimiento" || tarea.tipo === "primer_contacto") {
    return `Llamar a ${prospecto.nombre}`
  }
  const label = tarea.titulo?.trim() || tarea.tipo.replace(/_/g, " ")
  return `${label} · ${prospecto.nombre}`
}

export function buildNextBestActions(
  prospectos: Prospecto[],
  tareas: TareaVenta[]
): NextBestAction[] {
  const prospectosById = new Map(prospectos.map((p) => [p.id, p]))
  const items: NextBestAction[] = []
  const seenTaskProspecto = new Set<string>()

  for (const prospecto of prospectos) {
    const urgencia = getSlaUrgencia({
      fase: prospecto.fase,
      faseChangedAt: prospecto.faseChangedAt,
      diasEnFase: prospecto.diasEnFase,
      fechaProximoContacto: prospecto.fechaProximoContacto,
    })
    if (urgencia !== "breach" && urgencia !== "warning") continue

    items.push({
      id: `sla-${prospecto.id}`,
      kind: "sla",
      prospectoId: prospecto.id,
      prospecto,
      title: prospecto.nombre,
      subtitle: `${urgencia === "breach" ? "SLA vencido" : "SLA en aviso"} · ${getFaseConfig(prospecto.fase).label}`,
      isCritical: urgencia === "breach",
    })
  }

  const grupos = groupTareasForMiDia(tareas)
  const urgentTasks = [
    ...grupos.vencidas,
    ...grupos.hoy.filter((t) => t.prioridad === "alta"),
    ...grupos.hoy.filter((t) => !grupos.vencidas.includes(t) && t.prioridad !== "alta"),
  ]

  for (const tarea of urgentTasks) {
    const prospecto = prospectosById.get(tarea.prospectoId)
    if (!prospecto) continue
    if (seenTaskProspecto.has(tarea.prospectoId) && items.some((i) => i.prospectoId === tarea.prospectoId && i.kind === "task")) {
      continue
    }
    seenTaskProspecto.add(tarea.prospectoId)

    const isOverdue = grupos.vencidas.includes(tarea)
    items.push({
      id: `task-${tarea.id}`,
      kind: "task",
      prospectoId: prospecto.id,
      prospecto,
      tareaId: tarea.id,
      title: urgentTaskLabel(tarea, prospecto),
      subtitle: isOverdue ? "Tarea vencida" : "Tarea de hoy",
      isCritical: isOverdue,
    })
  }

  return items.sort((a, b) => {
    if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1
    if (a.kind !== b.kind) return a.kind === "sla" ? -1 : 1
    return 0
  })
}

export function addMonthsFromCadencia(
  from: Date,
  months: FidelizacionCadenciaMeses
): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() + months)
  return d
}
