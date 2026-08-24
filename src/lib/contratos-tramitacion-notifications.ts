import type { Contract } from "../types/contract"
import { normalizeContractEstado } from "./contract-estado"

export const TRAMITACION_INSERT_BUFFER_MS = 3 * 60 * 1000
export const TRAMITACION_SUMMARY_DEBOUNCE_MS = 45 * 1000
export const TRAMITACION_SUMMARY_INTERVAL_MS = 2 * 60 * 1000

const REVIEWED_STORAGE_KEY = "enersave:contratos-revisados-tramitacion"

export interface TramitacionInsertEvent {
  contractId: string
  comercialId: string
  comercialName: string
  insertedAt: number
}

export interface TramitacionComercialGroup {
  comercialId: string
  comercialName: string
  count: number
}

/** Estados «Temporal» / «Pendiente de info.» pendientes de revisión por tramitación. */
export function isTramitacionPendingReviewEstado(estado: string): boolean {
  const normalized = normalizeContractEstado(estado)
  return normalized === "Borrador" || normalized === "PTE DE TRAMITACIÓN"
}

export function isContractPendingTramitacionReview(
  contract: Pick<Contract, "id" | "estado">,
  reviewedIds: ReadonlySet<string>
): boolean {
  return (
    isTramitacionPendingReviewEstado(contract.estado) &&
    !reviewedIds.has(contract.id)
  )
}

export function loadReviewedTramitacionIds(): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set()
  try {
    const raw = sessionStorage.getItem(REVIEWED_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === "string"))
  } catch {
    return new Set()
  }
}

export function saveReviewedTramitacionIds(ids: ReadonlySet<string>): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(REVIEWED_STORAGE_KEY, JSON.stringify([...ids]))
}

export function countUnreviewedTramitacionContracts(
  contracts: Contract[],
  reviewedIds: ReadonlySet<string>
): number {
  return contracts.filter((c) => isContractPendingTramitacionReview(c, reviewedIds))
    .length
}

export function groupUnreviewedTramitacionByComercial(
  contracts: Contract[],
  reviewedIds: ReadonlySet<string>
): TramitacionComercialGroup[] {
  const map = new Map<string, TramitacionComercialGroup>()

  for (const contract of contracts) {
    if (!isContractPendingTramitacionReview(contract, reviewedIds)) continue
    const existing = map.get(contract.comercialId)
    if (existing) {
      existing.count += 1
      continue
    }
    map.set(contract.comercialId, {
      comercialId: contract.comercialId,
      comercialName: contract.comercialName || "Comercial sin nombre",
      count: 1,
    })
  }

  return [...map.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.comercialName.localeCompare(b.comercialName, "es", {
      sensitivity: "base",
    })
  })
}

export function formatTramitacionNuevosSummary(
  groups: TramitacionComercialGroup[]
): string | null {
  const total = groups.reduce((sum, group) => sum + group.count, 0)
  if (total <= 0) return null

  const parts = groups.map(
    (group) => `${group.count} de ${group.comercialName}`
  )

  return `${total} contrato${total === 1 ? "" : "s"} nuevo${total === 1 ? "" : "s"} — ${parts.join(", ")}`
}

export function groupInsertBufferByComercial(
  events: TramitacionInsertEvent[]
): TramitacionComercialGroup[] {
  const map = new Map<string, TramitacionComercialGroup>()

  for (const event of events) {
    const existing = map.get(event.comercialId)
    if (existing) {
      existing.count += 1
      continue
    }
    map.set(event.comercialId, {
      comercialId: event.comercialId,
      comercialName: event.comercialName,
      count: 1,
    })
  }

  return [...map.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.comercialName.localeCompare(b.comercialName, "es", {
      sensitivity: "base",
    })
  })
}

export function pruneInsertBuffer(
  events: TramitacionInsertEvent[],
  windowMs = TRAMITACION_INSERT_BUFFER_MS
): TramitacionInsertEvent[] {
  const cutoff = Date.now() - windowMs
  return events.filter((event) => event.insertedAt >= cutoff)
}

export function pushInsertBufferEvent(
  events: TramitacionInsertEvent[],
  event: TramitacionInsertEvent,
  windowMs = TRAMITACION_INSERT_BUFFER_MS
): TramitacionInsertEvent[] {
  return [...pruneInsertBuffer(events, windowMs), event]
}
