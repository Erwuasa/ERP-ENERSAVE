import type { AutofacturaRecord, CreateAutofacturaRecordInput } from "../../types/autofactura-record"
import {
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "autofacturas"

const SELECT =
  "id, comercial_id, comercial_name, periodo_mes, periodo_anio, settlement_ids, total_comisionado, generated_at"

function parseSettlementIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((value) => String(value)).filter((value) => value.length > 0)
}

export function mapRowToAutofacturaRecord(row: Row): AutofacturaRecord {
  return {
    id: String(row.id ?? ""),
    comercialId: str(row.comercial_id) ?? "",
    comercialName: str(row.comercial_name) ?? "",
    periodoMes: Number(row.periodo_mes ?? 0),
    periodoAnio: Number(row.periodo_anio ?? 0),
    settlementIds: parseSettlementIds(row.settlement_ids),
    totalComisionado: Number(row.total_comisionado ?? 0),
    generatedAt: str(row.generated_at) ?? new Date().toISOString(),
  }
}

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

export async function listAutofacturas(): Promise<SupabaseResult<AutofacturaRecord[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select(SELECT)
    .order("generated_at", { ascending: false })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRowToAutofacturaRecord(row as Row)) }
}

export async function createAutofacturaRecord(
  input: CreateAutofacturaRecordInput
): Promise<SupabaseResult<AutofacturaRecord>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert({
      comercial_id: input.comercialId,
      comercial_name: input.comercialName,
      periodo_mes: input.periodoMes,
      periodo_anio: input.periodoAnio,
      settlement_ids: input.settlementIds,
      total_comisionado: input.totalComisionado,
    })
    .select(SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToAutofacturaRecord(data as Row) }
}
