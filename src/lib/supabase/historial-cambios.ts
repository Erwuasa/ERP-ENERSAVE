import { resolveSupabaseClient, type SupabaseResult } from "./result"

export interface HistorialCambio {
  id: string
  tipoEvento: string
  estadoAnterior?: string
  estadoNuevo?: string
  motivo?: string
  autorNombre: string
  createdAt: string
}

export async function fetchHistorialContrato(
  contratoId: string
): Promise<SupabaseResult<HistorialCambio[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from("historial_cambios")
    .select("id, tipo_evento, estado_anterior, estado_nuevo, motivo, autor_nombre, created_at")
    .eq("entidad_tipo", "contrato")
    .eq("entidad_id", contratoId)
    .order("created_at", { ascending: false })

  if (error) {
    return { ok: false, reason: "error", message: error.message }
  }

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: String(row.id),
      tipoEvento: String(row.tipo_evento ?? ""),
      estadoAnterior: row.estado_anterior ? String(row.estado_anterior) : undefined,
      estadoNuevo: row.estado_nuevo ? String(row.estado_nuevo) : undefined,
      motivo: row.motivo ? String(row.motivo) : undefined,
      autorNombre: String(row.autor_nombre ?? "ERP"),
      createdAt: String(row.created_at ?? ""),
    })),
  }
}
