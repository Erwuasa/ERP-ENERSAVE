import type { Settlement } from "../../types/settlement"
import { isRetrocomisionSettlement } from "../liquidaciones-internas"
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
