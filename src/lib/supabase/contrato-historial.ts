import type { Contract } from "@/types/contract"
import type { ContratoHistorialEvento } from "@/lib/contrato-historial"
import { formatHistorialEstadoLabel } from "@/lib/contrato-historial"
import { migrateLegacyEstado } from "@/lib/incidencias"
import { resolveSupabaseClient, str, type SupabaseResult } from "@/lib/supabase/result"

const HISTORIAL_TABLE = "historial_cambios"
const INCIDENCIAS_TABLE = "incidencias"

type HistorialRow = {
  id: string
  entidad_tipo: string
  entidad_id: string
  tipo_evento: string
  estado_anterior: string | null
  estado_nuevo: string | null
  motivo: string | null
  autor_nombre: string
  created_at: string
}

function mapHistorialRow(row: HistorialRow): ContratoHistorialEvento {
  const tipo = row.tipo_evento as ContratoHistorialEvento["tipo"]

  if (tipo === "cambio_estado") {
    const anterior = formatHistorialEstadoLabel(row.estado_anterior ?? undefined)
    const nuevo = formatHistorialEstadoLabel(row.estado_nuevo ?? undefined)
    return {
      id: row.id,
      tipo,
      createdAt: row.created_at,
      autorNombre: row.autor_nombre,
      titulo: "Cambio de estado",
      detalle: `${anterior} → ${nuevo}${row.motivo ? ` · ${row.motivo}` : ""}`,
      estadoAnterior: row.estado_anterior ?? undefined,
      estadoNuevo: row.estado_nuevo ?? undefined,
    }
  }

  if (tipo === "documento_adjuntado") {
    return {
      id: row.id,
      tipo,
      createdAt: row.created_at,
      autorNombre: row.autor_nombre,
      titulo: "Documento adjuntado",
      detalle: row.motivo ?? undefined,
    }
  }

  if (tipo === "nota_interna") {
    return {
      id: row.id,
      tipo,
      createdAt: row.created_at,
      autorNombre: row.autor_nombre,
      titulo: "Nota interna",
      detalle: row.motivo ?? undefined,
    }
  }

  return {
    id: row.id,
    tipo: "nota_interna",
    createdAt: row.created_at,
    autorNombre: row.autor_nombre,
    titulo: "Evento registrado",
    detalle: row.motivo ?? undefined,
  }
}

function parseIncidenciaHistorialEstados(raw: unknown): Array<{
  estado: string
  fecha: string
  cambiadoPor: string
  motivo?: string
}> {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      estado: migrateLegacyEstado(String(entry.estado ?? "")),
      fecha: String(entry.fecha ?? ""),
      cambiadoPor: String(entry.cambiadoPor ?? entry.cambiado_por ?? ""),
      ...(entry.motivo ? { motivo: String(entry.motivo) } : {}),
    }))
    .filter((entry) => entry.fecha.length > 0 && entry.cambiadoPor.length > 0)
}

export async function insertContratoHistorialCambioEstado(input: {
  contratoId: string
  autorId: string
  autorNombre: string
  estadoAnterior: string
  estadoNuevo: string
  motivo?: string
}): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(HISTORIAL_TABLE).insert({
    entidad_tipo: "contrato",
    entidad_id: input.contratoId,
    tipo_evento: "cambio_estado",
    estado_anterior: input.estadoAnterior,
    estado_nuevo: input.estadoNuevo,
    motivo: input.motivo ?? null,
    autor_id: input.autorId,
    autor_nombre: input.autorNombre,
  })

  if (error) {
    return { ok: false, reason: "error", message: error.message, table: HISTORIAL_TABLE }
  }

  return { ok: true, data: undefined }
}

export async function fetchContratoHistorial(
  contract: Contract
): Promise<SupabaseResult<ContratoHistorialEvento[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const [historialRes, incidenciasRes] = await Promise.all([
    resolved.client
      .from(HISTORIAL_TABLE)
      .select(
        "id, entidad_tipo, entidad_id, tipo_evento, estado_anterior, estado_nuevo, motivo, autor_nombre, created_at"
      )
      .eq("entidad_tipo", "contrato")
      .eq("entidad_id", contract.id)
      .order("created_at", { ascending: false }),
    resolved.client
      .from(INCIDENCIAS_TABLE)
      .select("id, codigo, tipo, descripcion, created_at, historial_estados")
      .eq("contrato_id", contract.id)
      .order("created_at", { ascending: false }),
  ])

  if (historialRes.error) {
    return {
      ok: false,
      reason: "error",
      message: historialRes.error.message,
      table: HISTORIAL_TABLE,
    }
  }

  const eventos: ContratoHistorialEvento[] = (historialRes.data ?? []).map((row) =>
    mapHistorialRow(row as HistorialRow)
  )

  if (!incidenciasRes.error) {
    for (const row of incidenciasRes.data ?? []) {
      const incidenciaId = String(row.id ?? "")
      const codigo = str(row.codigo) ?? incidenciaId.slice(0, 8)
      const tipo = str(row.tipo) ?? "Incidencia"
      const createdAt = str(row.created_at)
      if (createdAt) {
        eventos.push({
          id: `incidencia-created-${incidenciaId}`,
          tipo: "incidencia",
          createdAt,
          autorNombre: "Sistema",
          titulo: "Incidencia registrada",
          detalle: `${codigo} · ${tipo}${str(row.descripcion) ? ` — ${str(row.descripcion)}` : ""}`,
        })
      }

      for (const entry of parseIncidenciaHistorialEstados(row.historial_estados)) {
        eventos.push({
          id: `incidencia-${incidenciaId}-${entry.fecha}-${entry.estado}`,
          tipo: "incidencia",
          createdAt: entry.fecha,
          autorNombre: entry.cambiadoPor,
          titulo: "Incidencia actualizada",
          detalle: `${codigo} · ${entry.estado.replace(/_/g, " ")}${entry.motivo ? ` — ${entry.motivo}` : ""}`,
          estadoNuevo: entry.estado,
        })
      }
    }
  }

  if (contract.createdAt) {
    eventos.push({
      id: `contrato-created-${contract.id}`,
      tipo: "contrato_creado",
      createdAt: contract.createdAt.includes("T")
        ? contract.createdAt
        : `${contract.createdAt}T12:00:00.000Z`,
      autorNombre: contract.comercialName || "Sistema",
      titulo: "Contrato creado",
      detalle: contract.clientName ? `Cliente: ${contract.clientName}` : undefined,
    })
  }

  eventos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return { ok: true, data: eventos }
}
