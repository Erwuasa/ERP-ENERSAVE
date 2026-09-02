import type { Settlement } from "../../types/settlement"
import type { Contract } from "../../types/contract"
import { isRetrocomisionSettlement } from "../liquidaciones-internas"
import {
  buildMonthlySettlementFromDesglose,
  calcularLiquidacionesMensualesTodoElEquipo,
  erpComercialFromProfile,
  monthlySettlementMarker,
  type ErpComercial,
} from "../liquidaciones-mensuales"
import { listTeamContracts } from "./contracts"
import { listErpComerciales, type ErpComercialRow } from "./erp-comerciales"
import { listMarcoRetributivo } from "./marco-retributivo"
import {
  isoDate,
  mapPatchToRow,
  num,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "settlements"

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

export function mapRowToSettlement(row: Row): Settlement {
  return {
    id: String(row.id ?? ""),
    comercialId: str(row.comercial_id) ?? "",
    comercialName: str(row.comercial_name) ?? "",
    montoInterno: num(row.monto_interno) ?? 0,
    montoExterno: num(row.monto_externo) ?? 0,
    estado: row.estado === "pagado" ? "pagado" : "pendiente",
    tipo: row.tipo === "gas" ? "gas" : "luz",
    descripcion: str(row.descripcion) ?? "",
    createdAt: isoDate(row.created_at) ?? "",
    contractId: str(row.contrato_id),
    source: row.source === "at" ? "at" : "manual",
    companyPaymentStatus: str(row.company_payment_status),
    collaboratorPaymentStatus: str(row.collaborator_payment_status),
  }
}

const PATCH_COLUMNS: Partial<Record<keyof Settlement, string>> = {
  comercialId: "comercial_id",
  comercialName: "comercial_name",
  montoInterno: "monto_interno",
  montoExterno: "monto_externo",
  estado: "estado",
  tipo: "tipo",
  descripcion: "descripcion",
  contractId: "contrato_id",
}

export function buildSettlementPatch(patch: Partial<Settlement>): Row {
  return mapPatchToRow(patch, PATCH_COLUMNS)
}

export async function listSettlements(): Promise<SupabaseResult<Settlement[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRowToSettlement(row as Row)) }
}

/**
 * `es_retrocomision` es una columna materializada para poder indexar el filtro
 * de la pestaña de retrocomisiones; en la app el flag se deriva del importe y
 * la descripción, así que se calcula aquí en vez de pedirlo al llamante.
 */
export async function createSettlement(
  settlement: Settlement
): Promise<SupabaseResult<Settlement>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const row: Row = {
    ...buildSettlementPatch(settlement),
    es_retrocomision: isRetrocomisionSettlement(settlement),
  }

  const { data, error } = await resolved.client.from(TABLE).insert(row).select("*").single()
  if (error) return toFailure(error)

  return { ok: true, data: mapRowToSettlement(data as Row) }
}

export async function createSettlementsBatch(
  settlements: Settlement[]
): Promise<SupabaseResult<Settlement[]>> {
  if (settlements.length === 0) {
    return { ok: true, data: [] }
  }

  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const rows = settlements.map((settlement) => ({
    ...buildSettlementPatch(settlement),
    es_retrocomision: isRetrocomisionSettlement(settlement),
  }))

  const { data, error } = await resolved.client.from(TABLE).insert(rows).select("*")
  if (error) return toFailure(error)

  return {
    ok: true,
    data: (data ?? []).map((row) => mapRowToSettlement(row as Row)),
  }
}

function erpComercialFromRow(row: ErpComercialRow): ErpComercial {
  return {
    id: row.id,
    fullName: row.full_name,
    commissionPercentage: row.commission_percentage,
    activo: row.activo !== false,
  }
}

function isSalesComercial(comercial: ErpComercialRow): boolean {
  return comercial.role === "comercial" || comercial.role === "jefe_comercial"
}

export function settlementExistsForMonthlyContract(
  settlements: Settlement[],
  contractId: string,
  mes: number,
  año: number
): boolean {
  const marker = monthlySettlementMarker(mes, año)
  return settlements.some(
    (settlement) =>
      settlement.contractId === contractId &&
      settlement.descripcion.includes(marker) &&
      !isRetrocomisionSettlement(settlement)
  )
}

export interface GenerarLiquidacionesDelMesResult {
  settlements: Settlement[]
  count: number
  totalComisionado: number
}

export async function generarLiquidacionesDelMes(
  mes: number,
  año: number,
  options: {
    contracts?: Contract[]
    comerciales?: ErpComercial[]
    existingSettlements?: Settlement[]
    formatCurrency?: (value: number) => string
  } = {}
): Promise<SupabaseResult<GenerarLiquidacionesDelMesResult>> {
  const formatCurrency =
    options.formatCurrency ??
    ((value: number) =>
      new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value))

  let contracts = options.contracts
  if (!contracts) {
    const contractsResult = await listTeamContracts()
    if (contractsResult.ok === false) return contractsResult
    contracts = contractsResult.data
  }

  let comerciales = options.comerciales
  if (!comerciales) {
    const comercialesResult = await listErpComerciales()
    if (comercialesResult.ok === false) {
      return { ok: false, reason: "error", message: comercialesResult.message }
    }
    comerciales = comercialesResult.data
      .filter(isSalesComercial)
      .map(erpComercialFromRow)
  }

  const existingSettlements = options.existingSettlements ?? []
  const marcosResult = await listMarcoRetributivo()
  const marcoRows = marcosResult.ok ? marcosResult.data : []
  const liquidaciones = calcularLiquidacionesMensualesTodoElEquipo(
    contracts,
    comerciales,
    mes,
    año,
    formatCurrency,
    marcoRows
  )

  const toCreate: Settlement[] = []

  for (const liquidacion of liquidaciones) {
    const comercial = comerciales.find((item) => item.id === liquidacion.comercialId)
    if (!comercial) continue

    for (const line of liquidacion.desglosePorContrato) {
      if (
        settlementExistsForMonthlyContract(
          existingSettlements,
          line.contractId,
          mes,
          año
        )
      ) {
        continue
      }
      toCreate.push(buildMonthlySettlementFromDesglose(line, comercial, mes, año))
    }
  }

  if (toCreate.length === 0) {
    return {
      ok: true,
      data: {
        settlements: [],
        count: 0,
        totalComisionado: 0,
      },
    }
  }

  const insertResult = await createSettlementsBatch(toCreate)
  if (insertResult.ok === false) return insertResult

  const totalComisionado = toCreate.reduce((sum, item) => sum + item.montoExterno, 0)

  return {
    ok: true,
    data: {
      settlements: insertResult.data,
      count: insertResult.data.length,
      totalComisionado: Math.round(totalComisionado * 100) / 100,
    },
  }
}

export async function generarLiquidacionesDelMesFromProfiles(
  mes: number,
  año: number,
  contracts: Contract[],
  profiles: Array<{
    id: string
    fullName: string
    role: string
    commissionPercentage?: number
    status?: string
  }>,
  existingSettlements: Settlement[],
  formatCurrency: (value: number) => string
): Promise<GenerarLiquidacionesDelMesResult> {
  const comerciales = profiles
    .filter((profile) => profile.role === "comercial" || profile.role === "jefe_comercial")
    .map(erpComercialFromProfile)

  const marcosResult = await listMarcoRetributivo()
  const marcoRows = marcosResult.ok ? marcosResult.data : []
  const liquidaciones = calcularLiquidacionesMensualesTodoElEquipo(
    contracts,
    comerciales,
    mes,
    año,
    formatCurrency,
    marcoRows
  )

  const settlements: Settlement[] = []

  for (const liquidacion of liquidaciones) {
    const comercial = comerciales.find((item) => item.id === liquidacion.comercialId)
    if (!comercial) continue

    for (const line of liquidacion.desglosePorContrato) {
      if (
        settlementExistsForMonthlyContract(
          [...existingSettlements, ...settlements],
          line.contractId,
          mes,
          año
        )
      ) {
        continue
      }
      settlements.push(buildMonthlySettlementFromDesglose(line, comercial, mes, año))
    }
  }

  return {
    settlements,
    count: settlements.length,
    totalComisionado: settlements.reduce((sum, item) => sum + item.montoExterno, 0),
  }
}

export async function updateSettlement(
  id: string,
  patch: Partial<Settlement>
): Promise<SupabaseResult<Settlement>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const row = buildSettlementPatch(patch)
  if (Object.keys(row).length === 0) {
    return { ok: false, reason: "error", message: "No hay cambios que persistir." }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToSettlement(data as Row) }
}

export async function deleteSettlement(id: string): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(TABLE).delete().eq("id", id)
  if (error) return toFailure(error)

  return { ok: true, data: undefined }
}
