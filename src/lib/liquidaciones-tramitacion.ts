import type { AutofacturaGestionEstado, AutofacturaRecord } from "../types/autofactura-record"
import type { Alegacion, AlegacionEstado } from "../types/alegacion"
import type { Settlement } from "../types/settlement"
import {
  type LiquidacionInternaRow,
  type LiquidacionesAdminScopeMode,
  type ProfileRow,
} from "./liquidaciones-internas"

const ALEGACION_ACTION_ESTADOS: AlegacionEstado[] = ["abierta", "en_revision"]

const ALEGACION_PRIORITY: Record<AlegacionEstado, number> = {
  abierta: 0,
  en_revision: 1,
  resuelta: 2,
}

export interface AutofacturaGestionItem {
  record: AutofacturaRecord
  estado: AutofacturaGestionEstado
}

export function comercialMatchesAdminScope(
  comercialId: string,
  profiles: ProfileRow[],
  mode: LiquidacionesAdminScopeMode,
  targetId: string
): boolean {
  if (mode === "todos") return true
  if (!targetId) return false
  if (mode === "comercial" || mode === "director") return comercialId === targetId

  if (mode === "equipo") {
    const profile = profiles.find((item) => item.id === comercialId)
    return profile?.managerId === targetId
  }

  return false
}

export function isAlegacionRequiringAction(estado: AlegacionEstado): boolean {
  return ALEGACION_ACTION_ESTADOS.includes(estado)
}

export function buildAlegacionGestionRows(
  rows: LiquidacionInternaRow[],
  alegacionBySettlementId: Map<string, Alegacion>
): LiquidacionInternaRow[] {
  return rows
    .filter((row) => {
      const alegacion = alegacionBySettlementId.get(row.settlement.id)
      return alegacion && isAlegacionRequiringAction(alegacion.estado)
    })
    .sort((left, right) => {
      const leftAlegacion = alegacionBySettlementId.get(left.settlement.id)!
      const rightAlegacion = alegacionBySettlementId.get(right.settlement.id)!
      const priorityDiff =
        ALEGACION_PRIORITY[leftAlegacion.estado] - ALEGACION_PRIORITY[rightAlegacion.estado]
      if (priorityDiff !== 0) return priorityDiff
      return rightAlegacion.creadaEn.localeCompare(leftAlegacion.creadaEn, "es")
    })
}

export function periodoOverlapsDateRange(
  mes: number,
  año: number,
  dateFrom: string,
  dateTo: string
): boolean {
  const periodStart = `${año}-${String(mes).padStart(2, "0")}-01`
  const lastDay = new Date(año, mes, 0).getDate()
  const periodEnd = `${año}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return periodStart <= dateTo && periodEnd >= dateFrom
}

export function resolveAutofacturaGestionEstado(
  record: AutofacturaRecord,
  settlementsById: Map<string, Settlement>
): AutofacturaGestionEstado {
  if (record.settlementIds.length === 0) return "pendiente"

  const linked = record.settlementIds
    .map((id) => settlementsById.get(id))
    .filter((settlement): settlement is Settlement => Boolean(settlement))

  if (linked.length === 0) return "pendiente"

  const hasPending = linked.some((settlement) => settlement.estado === "pendiente")
  return hasPending ? "pendiente" : "procesada"
}

export function filterAutofacturaRecordsForGestion(
  records: AutofacturaRecord[],
  options: {
    profiles: ProfileRow[]
    adminScopeMode: LiquidacionesAdminScopeMode
    adminScopeTargetId: string
    dateFrom: string
    dateTo: string
  }
): AutofacturaRecord[] {
  return records.filter(
    (record) =>
      comercialMatchesAdminScope(
        record.comercialId,
        options.profiles,
        options.adminScopeMode,
        options.adminScopeTargetId
      ) &&
      periodoOverlapsDateRange(
        record.periodoMes,
        record.periodoAnio,
        options.dateFrom,
        options.dateTo
      )
  )
}

export function buildAutofacturaGestionItems(
  records: AutofacturaRecord[],
  settlements: Settlement[]
): AutofacturaGestionItem[] {
  const settlementsById = new Map(settlements.map((settlement) => [settlement.id, settlement]))

  return records
    .map((record) => ({
      record,
      estado: resolveAutofacturaGestionEstado(record, settlementsById),
    }))
    .sort((left, right) => {
      if (left.estado !== right.estado) {
        return left.estado === "pendiente" ? -1 : 1
      }
      return right.record.generatedAt.localeCompare(left.record.generatedAt, "es")
    })
}

export function formatAutofacturaPeriodoLabel(mes: number, año: number): string {
  const date = new Date(año, mes - 1, 1)
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}
