import type { SettlementReclamacion } from "../../types/settlement-reclamacion"
import {
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "settlement_reclamaciones"

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

function mapRow(row: Row): SettlementReclamacion {
  return {
    settlementId: String(row.settlement_id ?? ""),
    comercialId: str(row.comercial_id) ?? "",
    createdAt: str(row.created_at) ?? new Date().toISOString(),
  }
}

export async function listSettlementReclamaciones(): Promise<
  SupabaseResult<SettlementReclamacion[]>
> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select("settlement_id, comercial_id, created_at")
    .order("created_at", { ascending: false })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRow(row as Row)) }
}

export async function createSettlementReclamacion(
  settlementId: string,
  comercialId: string
): Promise<SupabaseResult<SettlementReclamacion>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert({
      settlement_id: settlementId,
      comercial_id: comercialId,
    })
    .select("settlement_id, comercial_id, created_at")
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRow(data as Row) }
}

export async function deleteSettlementReclamacion(
  settlementId: string
): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(TABLE).delete().eq("settlement_id", settlementId)
  if (error) return toFailure(error)

  return { ok: true, data: undefined }
}
