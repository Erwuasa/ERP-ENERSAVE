import type { Settlement } from "../types/settlement"
import type { Contract } from "../types/contract"
import { normalizeTipoClienteSegment } from "./contract-segment-rules"

export interface ProfileRow {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

export interface LiquidacionInternaRow {
  settlement: Settlement
  contract?: Contract
  clientName: string
  cups: string
  direccion: string
  segmento: string
  compania: string
  tarifa: string
  fechaActivacion: string
  comision: number
  comercialId: string
  comercialName: string
  jefeEquipoId?: string | null
  jefeEquipoName?: string
}

export const LIQUIDACIONES_COMPANIA_FILTERS = [
  "Todos",
  "Repsol",
  "Naturgy",
  "Endesa",
  "Iberdrola",
  "Niba",
  "Ignis",
  "Axpo",
  "TotalEnergies",
  "Factorenergia",
] as const

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function inDateRange(dateIso: string, dateFrom: string, dateTo: string): boolean {
  const t = parseIsoDate(dateIso).getTime()
  return t >= parseIsoDate(dateFrom).getTime() && t <= parseIsoDate(dateTo).getTime()
}

function findContractForSettlement(settlement: Settlement, contracts: Contract[]): Contract | undefined {
  if (settlement.contractId) {
    return contracts.find((c) => c.id === settlement.contractId)
  }
  const desc = settlement.descripcion.toLowerCase()
  return contracts.find(
    (c) =>
      c.comercialId === settlement.comercialId &&
      (desc.includes(c.clientName.toLowerCase()) ||
        (c.cups && desc.includes(c.cups.toLowerCase())))
  )
}

export function enrichSettlementRow(
  settlement: Settlement,
  contracts: Contract[],
  profiles: ProfileRow[]
): LiquidacionInternaRow {
  const contract = findContractForSettlement(settlement, contracts)
  const manager = contract
    ? profiles.find((p) => p.id === contract.comercialId)?.managerId
    : profiles.find((p) => p.id === settlement.comercialId)?.managerId
  const jefe = manager ? profiles.find((p) => p.id === manager) : undefined

  return {
    settlement,
    contract,
    clientName: contract?.clientName ?? settlement.descripcion.replace(/^[^:]+:\s*/, ""),
    cups: contract?.cups ?? "—",
    direccion:
      contract?.direccionSuministro ??
      contract?.direccionCompleta ??
      contract?.direccionFiscal ??
      "—",
    segmento: contract
      ? normalizeTipoClienteSegment({
          tipoCliente: contract.tipoCliente,
          compania: contract.compania,
          clientName: contract.clientName,
          nif: contract.nif,
        })
      : settlement.tipo,
    compania: contract?.compania ?? "—",
    tarifa: contract?.tarifa ?? "—",
    fechaActivacion: contract?.createdAt ?? settlement.createdAt,
    comision: settlement.montoExterno,
    comercialId: settlement.comercialId,
    comercialName: settlement.comercialName,
    jefeEquipoId: jefe?.id ?? null,
    jefeEquipoName: jefe?.fullName,
  }
}

export function isRetrocomisionSettlement(settlement: Settlement): boolean {
  if (settlement.montoExterno < 0) return true
  return /retrocomisi/i.test(settlement.descripcion)
}

export function filterSettlementsForRole(
  settlements: Settlement[],
  role: string,
  activeUserId: string,
  profiles: ProfileRow[]
): Settlement[] {
  if (role === "comercial") {
    return settlements.filter((s) => s.comercialId === activeUserId)
  }
  if (role === "jefe_comercial") {
    const teamIds = new Set([
      activeUserId,
      ...profiles.filter((p) => p.managerId === activeUserId).map((p) => p.id),
    ])
    return settlements.filter((s) => teamIds.has(s.comercialId))
  }
  if (role === "superadmin") {
    return settlements
  }
  return []
}

export function filterLiquidacionRows(
  rows: LiquidacionInternaRow[],
  options: {
    tab: "totales" | "pendientes" | "retrocomisiones"
    dateFrom: string
    dateTo: string
    compania: string
    search: string
  }
): LiquidacionInternaRow[] {
  return rows.filter((row) => {
    if (!inDateRange(row.settlement.createdAt, options.dateFrom, options.dateTo)) return false

    if (options.tab === "pendientes") {
      if (row.settlement.estado !== "pendiente" || isRetrocomisionSettlement(row.settlement)) {
        return false
      }
    } else if (options.tab === "retrocomisiones") {
      if (!isRetrocomisionSettlement(row.settlement)) return false
    }

    if (options.compania !== "Todos") {
      if (!row.compania.toLowerCase().includes(options.compania.toLowerCase())) return false
    }

    if (options.search.trim()) {
      const q = options.search.toLowerCase()
      return (
        row.clientName.toLowerCase().includes(q) ||
        row.cups.toLowerCase().includes(q) ||
        row.compania.toLowerCase().includes(q) ||
        row.comercialName.toLowerCase().includes(q)
      )
    }
    return true
  })
}

export function sumComisionRows(rows: LiquidacionInternaRow[]): number {
  return rows.reduce((sum, r) => sum + r.comision, 0)
}

export function defaultLiquidacionesDateRange(reference = new Date()) {
  const dateTo = reference.toISOString().slice(0, 10)
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  return { dateFrom: start.toISOString().slice(0, 10), dateTo }
}

export function groupRowsByJefe(rows: LiquidacionInternaRow[]): Map<string, LiquidacionInternaRow[]> {
  const map = new Map<string, LiquidacionInternaRow[]>()
  for (const row of rows) {
    const key = row.jefeEquipoName ?? "Sin jefe asignado"
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }
  return map
}
