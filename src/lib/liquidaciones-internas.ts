import type { Alegacion } from "../types/alegacion"
import type { Settlement } from "../types/settlement"
import type { Contract } from "../types/contract"
import { liquidacionRowMatchesSearch, resolveContractReferencia } from "./contract-referencia"
import { computeComisionBreakdown } from "./marco-commission"
import {
  resolveMarcoCatalogEntry,
  type MarcoRetributivoRow,
} from "./supabase/marco-retributivo"
import { normalizeTipoClienteSegment } from "./contract-segment-rules"
import { normalizePeaje } from "./tarifa-cost-calculator"
import {
  formatCompaniaLabel,
  normalizeCompaniaKey,
  resolveCompaniaLogoKey,
} from "./erp/compania-logos"

export type LiquidacionesSortDirection = "asc" | "desc"

export function resolveLiquidacionPeaje(contract: Contract | undefined, tarifa: string): string {
  if (contract?.atr?.trim()) return normalizePeaje(contract.atr)

  const tarifaCandidates = [
    contract?.tarifa,
    tarifa,
    contract?.tipo === "gas" ? "RL1" : undefined,
  ].filter(Boolean) as string[]

  for (const candidate of tarifaCandidates) {
    const normalized = candidate.toLowerCase()
    if (normalized.includes("6.1")) return "6.1TD"
    if (normalized.includes("6.0")) return "6.0TD"
    if (normalized.includes("3.0")) return "3.0TD"
    if (normalized.includes("2.0")) return "2.0TD"
  }

  return "—"
}

function canonicalLiquidacionSegmento(
  contract: Contract,
  compania: string
): "residencial" | "pyme" {
  const inferred = normalizeTipoClienteSegment({
    tipoCliente: contract.tipoCliente,
    compania,
    clientName: contract.clientName,
    nif: contract.nif,
  })
  if (inferred === "residencial") return "residencial"
  return "pyme"
}

export function resolveLiquidacionComercialDisplayName(
  row: Pick<LiquidacionInternaRow, "comercialId" | "comercialName">,
  profiles: ProfileRow[]
): string {
  const profile = profiles.find((item) => item.id === row.comercialId)
  const candidate = profile?.fullName?.trim() || row.comercialName?.trim() || ""
  if (!candidate || candidate.toUpperCase() === "AT") return profile?.fullName?.trim() || "—"
  return candidate
}

export function normalizeLiquidacionSegmentoKey(
  segmento: string
): "residencial" | "pyme" | null {
  const value = segmento.toLowerCase().trim()
  if (!value || value === "—" || value === "luz" || value === "gas") return null
  if (
    value === "residencial" ||
    value === "particular" ||
    value === "domestico" ||
    value === "doméstico"
  ) {
    return "residencial"
  }
  if (
    value === "pyme" ||
    value === "empresa" ||
    value === "empresas" ||
    value === "autonomo" ||
    value === "autónomo" ||
    value === "comunidades" ||
    value === "comunidad_vecinos" ||
    value === "comunidad"
  ) {
    return "pyme"
  }
  return null
}

export function resolveLiquidacionSegmentoKey(
  row: Pick<LiquidacionInternaRow, "segmento" | "contract">
): "residencial" | "pyme" | null {
  const fromRow = normalizeLiquidacionSegmentoKey(row.segmento)
  if (fromRow) return fromRow

  if (!row.contract) return null

  const inferred = normalizeTipoClienteSegment({
    tipoCliente: row.contract.tipoCliente,
    compania: row.contract.compania,
    clientName: row.contract.clientName,
    nif: row.contract.nif,
  })
  if (inferred === "residencial") return "residencial"
  return "pyme"
}

export function formatLiquidacionSegmentoLabel(segmento: string): string {
  const key = normalizeLiquidacionSegmentoKey(segmento)
  if (key === "residencial") return "Residencial"
  if (key === "pyme") return "PYME"
  return "—"
}

export function formatLiquidacionPeajeLabel(peaje: string): string {
  if (!peaje || peaje === "—") return "—"
  const normalized = peaje.toUpperCase().replace(/\s+/g, "")
  if (normalized.includes("6.1")) return "6.1TD"
  if (normalized.includes("6.0")) return "6.0TD"
  if (normalized.includes("3.0")) return "3.0TD"
  if (normalized.includes("2.0")) return "2.0TD"
  const match = peaje.match(/(\d\.\d)/)
  if (match) return `${match[1]}TD`
  return peaje.replace(/TD/gi, "").trim() || "—"
}

function liquidacionSegmentoSortRank(
  row: Pick<LiquidacionInternaRow, "segmento" | "contract">
): number {
  const key = resolveLiquidacionSegmentoKey(row)
  if (key === "residencial") return 0
  if (key === "pyme") return 1
  return 2
}

export function compareLiquidacionSegmentoSort(
  left: Pick<LiquidacionInternaRow, "segmento" | "contract">,
  right: Pick<LiquidacionInternaRow, "segmento" | "contract">,
  direction: LiquidacionesSortDirection
): number {
  const leftRank = liquidacionSegmentoSortRank(left)
  const rightRank = liquidacionSegmentoSortRank(right)

  if (leftRank === 2 && rightRank !== 2) return 1
  if (rightRank === 2 && leftRank !== 2) return -1
  if (leftRank === 2 && rightRank === 2) return 0

  const diff = leftRank - rightRank
  if (diff === 0) return 0
  return direction === "asc" ? diff : -diff
}

export function applyLiquidacionTableOrdering(
  rows: LiquidacionInternaRow[],
  options: {
    segmentoSort: LiquidacionesSortDirection | null
    activacionSort: LiquidacionesSortDirection
    comisionSort: LiquidacionesSortDirection | null
  }
): LiquidacionInternaRow[] {
  return [...rows].sort((left, right) => {
    if (options.segmentoSort) {
      const segmentDiff = compareLiquidacionSegmentoSort(left, right, options.segmentoSort)
      if (segmentDiff !== 0) return segmentDiff
    }

    if (options.comisionSort) {
      const diff = left.comision - right.comision
      if (diff !== 0) {
        return options.comisionSort === "desc" ? -diff : diff
      }
    }

    const leftTime = parseIsoDate(left.fechaActivacion).getTime()
    const rightTime = parseIsoDate(right.fechaActivacion).getTime()
    return options.activacionSort === "desc" ? rightTime - leftTime : leftTime - rightTime
  })
}

export interface ProfileRow {
  id: string
  fullName: string
  role: string
  managerId?: string | null
  commissionPercentage?: number
  status?: "activo" | "suspendido" | "pendiente"
}

export interface LiquidacionInternaRow {
  settlement: Settlement
  contract?: Contract
  clientName: string
  cups: string
  direccion: string
  segmento: string
  peaje: string
  compania: string
  tarifa: string
  fechaActivacion: string
  fechaBaja: string
  comision: number
  comercialId: string
  comercialName: string
  contractReferencia: string
  jefeEquipoId?: string | null
  jefeEquipoName?: string
}

export type LiquidacionesAdminScopeMode = "todos" | "comercial" | "director" | "equipo"

export const LIQUIDACIONES_ADMIN_SCOPE_OPTIONS: ReadonlyArray<{
  id: LiquidacionesAdminScopeMode
  label: string
}> = [
  { id: "todos", label: "Todos" },
  { id: "comercial", label: "Por comercial" },
  { id: "director", label: "Por director comercial" },
  { id: "equipo", label: "Por equipo de director" },
]

export function adminScopeRequiresTarget(mode: LiquidacionesAdminScopeMode): boolean {
  return mode !== "todos"
}

export function isActiveProfileRow(profile: ProfileRow): boolean {
  if (!profile.status) return true
  return profile.status === "activo"
}

export function listActiveProfilesByRole(
  profiles: ProfileRow[],
  role: ProfileRow["role"]
): ProfileRow[] {
  return profiles
    .filter((profile) => profile.role === role && isActiveProfileRow(profile))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "es"))
}

export interface LiquidacionEquipoGroup {
  key: string
  title: string
  rows: LiquidacionInternaRow[]
}

export interface LiquidacionCompaniaFilterOption {
  name: string
  count: number
}

function isPlaceholderCompania(name: string | null | undefined): boolean {
  const raw = name?.trim() ?? ""
  if (!raw || raw === "—") return true
  const lowered = raw.toLowerCase()
  if (lowered === "sin compañía" || lowered === "sin compania") return true
  return normalizeCompaniaKey(raw) === "at"
}

export function matchesCompaniaFilter(compania: string, filter: string): boolean {
  if (!filter || filter === "Todos") return true
  if (isPlaceholderCompania(compania)) return false

  const rowKey = resolveCompaniaLogoKey(compania)
  const filterKey = resolveCompaniaLogoKey(filter)
  if (rowKey && filterKey) return rowKey === filterKey

  const rowNorm = normalizeCompaniaKey(compania)
  const filterNorm = normalizeCompaniaKey(filter)
  if (!rowNorm || !filterNorm) return false
  return rowNorm === filterNorm || rowNorm.includes(filterNorm) || filterNorm.includes(rowNorm)
}

function inferCompaniaFromText(text: string): string | undefined {
  const key = resolveCompaniaLogoKey(text)
  if (key) return formatCompaniaLabel(key)
  const compact = normalizeCompaniaKey(text)
  if (compact.includes("factorenergia")) return "Factorenergia"
  return undefined
}

export function resolveLiquidacionCompania(
  contract: Contract | undefined,
  settlement: Settlement,
  marcoRows: MarcoRetributivoRow[] = []
): string {
  const fromContract = contract?.compania?.trim()
  if (fromContract && !isPlaceholderCompania(fromContract)) return fromContract

  if (contract?.marcoEntryId) {
    const marco = marcoRows.find((row) => row.id === contract.marcoEntryId)
    if (marco?.compania && !isPlaceholderCompania(marco.compania)) return marco.compania
  }

  if (contract?.tarifa) {
    const marco = marcoRows.find(
      (row) =>
        row.tarifa === contract.tarifa &&
        (!contract.tipo || row.tipo === contract.tipo) &&
        !isPlaceholderCompania(row.compania)
    )
    if (marco?.compania) return marco.compania
  }

  return (
    inferCompaniaFromText(settlement.descripcion) ||
    inferCompaniaFromText(contract?.tarifa ?? "") ||
    (fromContract && !isPlaceholderCompania(fromContract) ? fromContract : undefined) ||
    "—"
  )
}

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
    const byId = contracts.find((c) => c.id === settlement.contractId)
    if (byId) return byId
    const byAt = contracts.find((c) => c.atContractId === settlement.contractId)
    if (byAt) return byAt
  }
  const desc = settlement.descripcion.toLowerCase()
  return contracts.find(
    (c) =>
      c.comercialId === settlement.comercialId &&
      (desc.includes(c.clientName.toLowerCase()) ||
        (c.cups && desc.includes(c.cups.toLowerCase())))
  )
}

function resolveComisionComercialFromContract(
  contract: Contract,
  profiles: ProfileRow[],
  formatCurrency: (val: number) => string,
  marcoRows: MarcoRetributivoRow[] = []
): number | null {
  const entry = resolveMarcoCatalogEntry(
    contract.marcoEntryId,
    contract.compania,
    contract.tarifa,
    contract.tipo,
    marcoRows
  )
  if (!entry) return null

  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
  if (!consumo || consumo <= 0) return null

  const profile = profiles.find((p) => p.id === contract.comercialId)
  const commissionPercentage = profile?.commissionPercentage ?? 70

  return computeComisionBreakdown(entry, commissionPercentage, consumo, formatCurrency)
    .comisionComercial
}

export function enrichSettlementRow(
  settlement: Settlement,
  contracts: Contract[],
  profiles: ProfileRow[],
  formatCurrency: (val: number) => string,
  marcoRows: MarcoRetributivoRow[] = []
): LiquidacionInternaRow {
  const contract = findContractForSettlement(settlement, contracts)
  const compania = resolveLiquidacionCompania(contract, settlement, marcoRows)
  const contractComercialId = contract?.comercialId ?? settlement.comercialId
  const contractComercialProfile = profiles.find((p) => p.id === contractComercialId)
  const managerId =
    contractComercialProfile?.managerId ??
    profiles.find((p) => p.id === settlement.comercialId)?.managerId
  const jefe = managerId ? profiles.find((p) => p.id === managerId) : undefined

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
    segmento: contract ? canonicalLiquidacionSegmento(contract, compania) : "—",
    peaje: resolveLiquidacionPeaje(contract, contract?.tarifa ?? settlement.descripcion),
    compania,
    tarifa: contract?.tarifa ?? "—",
    fechaActivacion:
      contract?.estadoEfectivoDesde ?? contract?.createdAt ?? settlement.createdAt,
    fechaBaja: settlement.fechaBaja ?? contract?.fechaBaja ?? "—",
    comision: isRetrocomisionSettlement(settlement)
      ? settlement.montoExterno
      : contract != null
        ? resolveComisionComercialFromContract(
            { ...contract, compania },
            profiles,
            formatCurrency,
            marcoRows
          ) ?? settlement.montoExterno
        : settlement.montoExterno,
    comercialId: contractComercialId,
    comercialName: resolveLiquidacionComercialDisplayName(
      {
        comercialId: contractComercialId,
        comercialName:
          contract?.comercialName ??
          contractComercialProfile?.fullName ??
          settlement.comercialName,
      },
      profiles
    ),
    contractReferencia: resolveContractReferencia(contract),
    jefeEquipoId: jefe?.id ?? null,
    jefeEquipoName: jefe?.fullName,
  }
}

export function resolveEffectiveComision(
  row: LiquidacionInternaRow,
  alegacion?: Alegacion | null
): number {
  if (
    alegacion?.comisionAjustada != null &&
    Number.isFinite(alegacion.comisionAjustada)
  ) {
    return alegacion.comisionAjustada
  }
  return row.comision
}

export function applyEffectiveComisionToRows(
  rows: LiquidacionInternaRow[],
  alegacionBySettlementId: Map<string, Alegacion>
): LiquidacionInternaRow[] {
  return rows.map((row) => {
    const alegacion = alegacionBySettlementId.get(row.settlement.id)
    const comision = resolveEffectiveComision(row, alegacion)
    if (comision === row.comision) return row
    return { ...row, comision }
  })
}

export function isRetrocomisionSettlement(settlement: Settlement): boolean {
  if (settlement.tipoEvento === "retrocomision") return true
  if (settlement.montoExterno < 0) return true
  return /retrocomisi/i.test(settlement.descripcion)
}

export function isResidencialSegment(segmento: string): boolean {
  return segmento.toLowerCase() === "residencial"
}

/** Residencial: día 10 del mes siguiente; resto (pyme, comunidades…): día 31. */
export function getExpectedCobroDate(fechaActivacionIso: string, segmento: string): Date {
  const activation = parseIsoDate(fechaActivacionIso)
  const payDay = isResidencialSegment(segmento) ? 10 : 31
  return new Date(activation.getFullYear(), activation.getMonth() + 1, payDay)
}

export function isPendingCobroRow(
  row: LiquidacionInternaRow,
  _reference = new Date()
): boolean {
  if (isRetrocomisionSettlement(row.settlement)) return false
  if (row.comision <= 0) return false
  if (row.settlement.estado === "pagado") return false
  return true
}

/** Cobradas (pagado) menos retrocomisiones del periodo filtrado. */
export function computeKpiLiquidacionesTotales(rows: LiquidacionInternaRow[]): number {
  const cobradas = rows
    .filter((row) => !isRetrocomisionSettlement(row.settlement) && row.settlement.estado === "pagado")
    .reduce((sum, row) => sum + row.comision, 0)
  const retro = rows
    .filter((row) => isRetrocomisionSettlement(row.settlement))
    .reduce((sum, row) => sum + row.comision, 0)
  return cobradas + retro
}

export function computeKpiPendientesCobro(
  rows: LiquidacionInternaRow[],
  reference = new Date()
): number {
  return rows
    .filter((row) => isPendingCobroRow(row, reference))
    .reduce((sum, row) => sum + row.comision, 0)
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
  if (role === "superadmin" || role === "tramitacion") {
    return settlements
  }
  return []
}

export function filterLiquidacionRowsByScope(
  rows: LiquidacionInternaRow[],
  options: {
    dateFrom: string
    dateTo: string
    compania: string
    search: string
  }
): LiquidacionInternaRow[] {
  return rows.filter((row) => {
    if (!inDateRange(row.settlement.createdAt, options.dateFrom, options.dateTo)) return false

    if (options.compania !== "Todos" && !matchesCompaniaFilter(row.compania, options.compania)) {
      return false
    }

    if (options.search.trim()) {
      if (!liquidacionRowMatchesSearch(row, options.search)) return false
    }
    return true
  })
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
  return filterLiquidacionRowsByScope(rows, options).filter((row) => {
    if (options.tab === "pendientes") {
      if (!isPendingCobroRow(row)) return false
    } else if (options.tab === "retrocomisiones") {
      if (!isRetrocomisionSettlement(row.settlement)) return false
    } else if (options.tab === "totales") {
      if (isRetrocomisionSettlement(row.settlement)) return false
    }

    return true
  })
}

function getLiquidacionCompaniaGroupKey(compania: string): string | null {
  if (isPlaceholderCompania(compania)) return null
  const logoKey = resolveCompaniaLogoKey(compania)
  if (logoKey) return logoKey
  const normalized = normalizeCompaniaKey(compania)
  return normalized || null
}

function getLiquidacionCompaniaDisplayName(compania: string): string {
  const logoKey = resolveCompaniaLogoKey(compania)
  if (logoKey) return formatCompaniaLabel(logoKey)
  return formatCompaniaLabel(compania)
}

export function filterLiquidacionRowsForCompaniaCounts(
  rows: LiquidacionInternaRow[],
  options: {
    tab: "totales" | "pendientes" | "retrocomisiones"
    dateFrom: string
    dateTo: string
    search: string
  }
): LiquidacionInternaRow[] {
  return filterLiquidacionRows(rows, { ...options, compania: "Todos" })
}

export function buildLiquidacionCompaniaFilterOptions(
  rows: LiquidacionInternaRow[]
): LiquidacionCompaniaFilterOption[] {
  const counts = new Map<string, LiquidacionCompaniaFilterOption>()

  for (const row of rows) {
    const groupKey = getLiquidacionCompaniaGroupKey(row.compania)
    if (!groupKey) continue

    const existing = counts.get(groupKey)
    if (existing) {
      existing.count += 1
      continue
    }

    counts.set(groupKey, {
      name: getLiquidacionCompaniaDisplayName(row.compania),
      count: 1,
    })
  }

  return [...counts.values()]
    .filter((option) => option.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.name.localeCompare(right.name, "es")
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

export function filterRowsForAdminScope(
  rows: LiquidacionInternaRow[],
  profiles: ProfileRow[],
  mode: LiquidacionesAdminScopeMode,
  targetId: string
): LiquidacionInternaRow[] {
  if (mode === "todos") return rows
  if (!targetId) return []

  if (mode === "comercial") {
    return rows.filter((row) => row.comercialId === targetId)
  }

  if (mode === "director") {
    return rows.filter((row) => row.comercialId === targetId)
  }

  if (mode === "equipo") {
    const teamIds = new Set(
      profiles
        .filter((profile) => profile.managerId === targetId && profile.role === "comercial")
        .map((profile) => profile.id)
    )
    return rows.filter((row) => teamIds.has(row.comercialId))
  }

  return rows
}

export function groupRowsByEquipoDirector(
  rows: LiquidacionInternaRow[]
): LiquidacionEquipoGroup[] {
  const map = new Map<string, LiquidacionInternaRow[]>()

  for (const row of rows) {
    if (!row.jefeEquipoId || !row.jefeEquipoName) continue
    const list = map.get(row.jefeEquipoId) ?? []
    list.push(row)
    map.set(row.jefeEquipoId, list)
  }

  return [...map.entries()]
    .map(([key, teamRows]) => ({
      key,
      title: `Equipo de ${teamRows[0]?.jefeEquipoName ?? ""}`,
      rows: teamRows,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "es"))
}

/** @deprecated Use groupRowsByEquipoDirector */
export function groupRowsByJefe(rows: LiquidacionInternaRow[]): Map<string, LiquidacionInternaRow[]> {
  const map = new Map<string, LiquidacionInternaRow[]>()
  for (const row of rows) {
    if (!row.jefeEquipoName || !row.jefeEquipoId) continue
    const key = row.jefeEquipoName
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }
  return map
}
