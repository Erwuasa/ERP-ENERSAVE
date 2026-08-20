import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  CreateProspectoInput,
  ListProspectosFilters,
  Prospecto,
  SubtipoProspecto,
  UpdateProspectoFaseInput,
  UpdateProspectoPatch,
} from "../ventas/types"
import {
  isVentasFailure,
  mapSupabaseError,
  parseRpcProspectoRow,
  readMetadataString,
  requireSupabase,
  type VentasResult,
} from "./ventas-shared"
import type { ProspectoRow } from "./ventas-types"

function readSubtipoFromMetadata(metadata?: Record<string, unknown>): SubtipoProspecto | undefined {
  const value = metadata?.subtipo_prospecto
  if (
    value === "base_datos" ||
    value === "vecino_zona" ||
    value === "contacto_previo" ||
    value === "referido"
  ) {
    return value
  }
  return undefined
}

function buildProspectoUpdateRow(
  patch: UpdateProspectoPatch | UpdateProspectoFaseInput,
  existingMetadata?: Record<string, unknown>
): Record<string, unknown> {
  if ("metadata" in patch && patch.metadata !== undefined && Object.keys(patch).length === 1) {
    return { metadata: patch.metadata }
  }

  const row: Record<string, unknown> = {}
  const metadata: Record<string, unknown> = {
    ...(existingMetadata ?? {}),
    ...("metadata" in patch ? (patch.metadata ?? {}) : {}),
  }

  if ("fase" in patch && patch.fase !== undefined) row.fase = patch.fase
  if ("nombre" in patch && patch.nombre !== undefined) row.nombre_negocio = patch.nombre
  if ("telefono" in patch && patch.telefono !== undefined) row.telefono = patch.telefono
  if ("email" in patch && patch.email !== undefined) row.email = patch.email
  if ("nif" in patch && patch.nif !== undefined) metadata.nif = patch.nif
  if ("cups" in patch && patch.cups !== undefined) row.cups = patch.cups
  if ("tipoSuministro" in patch && patch.tipoSuministro !== undefined)
    row.tipo_suministro = patch.tipoSuministro
  if ("consumoAnualKwh" in patch && patch.consumoAnualKwh !== undefined)
    row.consumo_anual_kwh = patch.consumoAnualKwh
  if ("companiaActual" in patch && patch.companiaActual !== undefined)
    row.compania_actual = patch.companiaActual
  if ("vencimientoPermanencia" in patch && patch.vencimientoPermanencia !== undefined)
    metadata.vencimiento_permanencia = patch.vencimientoPermanencia
  if ("tarifaActual" in patch && patch.tarifaActual !== undefined)
    row.tarifa_actual = patch.tarifaActual
  if ("propuestaCompania" in patch && patch.propuestaCompania !== undefined)
    metadata.propuesta_compania = patch.propuestaCompania
  if ("propuestaTarifa" in patch && patch.propuestaTarifa !== undefined)
    metadata.propuesta_tarifa = patch.propuestaTarifa
  if ("propuestaNotas" in patch && patch.propuestaNotas !== undefined)
    metadata.propuesta_notas = patch.propuestaNotas
  if ("direccion" in patch && patch.direccion !== undefined) row.direccion = patch.direccion
  if ("codigoPostal" in patch && patch.codigoPostal !== undefined)
    metadata.codigo_postal = patch.codigoPostal
  if ("poblacion" in patch && patch.poblacion !== undefined) row.poblacion = patch.poblacion
  if ("provincia" in patch && patch.provincia !== undefined) row.provincia = patch.provincia
  if ("contratoEquipoId" in patch && patch.contratoEquipoId !== undefined)
    metadata.contrato_equipo_id = patch.contratoEquipoId

  if ("fechaProximoContacto" in patch && patch.fechaProximoContacto !== undefined)
    metadata.fecha_proximo_contacto = patch.fechaProximoContacto
  if ("subtipoProspecto" in patch && patch.subtipoProspecto !== undefined)
    metadata.subtipo_prospecto = patch.subtipoProspecto
  if ("subEstado" in patch && patch.subEstado !== undefined) metadata.sub_estado = patch.subEstado
  if ("motivoConDudas" in patch && patch.motivoConDudas !== undefined)
    metadata.motivo_con_dudas = patch.motivoConDudas
  if ("motivoRecontacto" in patch && patch.motivoRecontacto !== undefined)
    metadata.motivo_recontacto = patch.motivoRecontacto
  if ("fechaRecontactar" in patch && patch.fechaRecontactar !== undefined)
    metadata.fecha_recontactar = patch.fechaRecontactar
  if ("motivoDescarte" in patch && patch.motivoDescarte !== undefined)
    metadata.motivo_descarte = patch.motivoDescarte

  row.metadata = metadata
  return row
}

async function persistProspectoUpdate(
  client: SupabaseClient,
  id: string,
  row: Record<string, unknown>
): Promise<VentasResult<Prospecto>> {
  const rpcResult = await client.rpc("update_prospecto_v1", { p_id: id, payload: row })
  if (!rpcResult.error && rpcResult.data) {
    return {
      ok: true,
      data: mapProspectoRow(parseRpcProspectoRow(rpcResult.data)),
    }
  }

  const { data, error } = await client
    .from("prospectos")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) return mapSupabaseError(error)
  if (data) return { ok: true, data: mapProspectoRow(data as ProspectoRow) }

  const refetch = await getProspecto(id)
  if (refetch.ok) return refetch

  return {
    ok: false,
    reason: "error",
    message:
      refetch.ok === false ? refetch.message : "Actualizado pero no se pudo leer el prospecto.",
  }
}

export function mapProspectoRow(row: ProspectoRow): Prospecto {
  const metadata = row.metadata ?? undefined
  return {
    id: row.id,
    comercialId: row.comercial_id,
    comercialName: row.comercial_name,
    nombre: row.nombre ?? row.nombre_negocio ?? "",
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    nif: row.nif ?? readMetadataString(metadata, "nif"),
    fase: row.fase ?? "prospecto_nuevo",
    faseChangedAt: row.fase_changed_at ?? row.fecha_cambio_fase ?? row.created_at,
    diasEnFase: row.dias_en_fase ?? 0,
    subtipoProspecto: row.subtipo_prospecto ?? readSubtipoFromMetadata(metadata),
    fechaProximoContacto:
      row.fecha_proximo_contacto ?? readMetadataString(metadata, "fecha_proximo_contacto"),
    subEstado:
      (row.sub_estado as ProspectoRow["sub_estado"]) ??
      (readMetadataString(metadata, "sub_estado") as Prospecto["subEstado"]),
    motivoConDudas: row.motivo_con_dudas ?? readMetadataString(metadata, "motivo_con_dudas"),
    motivoRecontacto: row.motivo_recontacto ?? readMetadataString(metadata, "motivo_recontacto"),
    fechaRecontactar: row.fecha_recontactar ?? readMetadataString(metadata, "fecha_recontactar"),
    motivoDescarte:
      (row.motivo_descarte as ProspectoRow["motivo_descarte"]) ??
      (readMetadataString(metadata, "motivo_descarte") as Prospecto["motivoDescarte"]),
    contratoEquipoId: row.contrato_equipo_id ?? readMetadataString(metadata, "contrato_equipo_id"),
    cups: row.cups ?? undefined,
    tipoSuministro: row.tipo_suministro ?? undefined,
    consumoAnualKwh: row.consumo_anual_kwh ?? undefined,
    companiaActual: row.compania_actual ?? undefined,
    vencimientoPermanencia:
      row.vencimiento_permanencia ?? readMetadataString(metadata, "vencimiento_permanencia"),
    tarifaActual: row.tarifa_actual ?? undefined,
    propuestaCompania: row.propuesta_compania ?? readMetadataString(metadata, "propuesta_compania"),
    propuestaTarifa: row.propuesta_tarifa ?? readMetadataString(metadata, "propuesta_tarifa"),
    propuestaNotas: row.propuesta_notas ?? readMetadataString(metadata, "propuesta_notas"),
    direccion: row.direccion ?? undefined,
    codigoPostal: row.codigo_postal ?? readMetadataString(metadata, "codigo_postal"),
    poblacion: row.poblacion ?? undefined,
    provincia: row.provincia ?? undefined,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function buildProspectoInsert(input: CreateProspectoInput) {
  const metadata: Record<string, unknown> = input.metadata ? { ...input.metadata } : {}
  if (input.subtipoProspecto) metadata.subtipo_prospecto = input.subtipoProspecto

  return {
    nombre_negocio: input.nombre,
    comercial_id: input.comercialId,
    comercial_name: input.comercialName,
    telefono: input.telefono ?? null,
    email: input.email ?? null,
    fase: input.fase ?? "prospecto_nuevo",
    cups: input.cups ?? null,
    tipo_suministro: input.tipoSuministro ?? null,
    consumo_anual_kwh: input.consumoAnualKwh ?? null,
    compania_actual: input.companiaActual ?? null,
    tarifa_actual: input.tarifaActual ?? null,
    direccion: input.direccion ?? null,
    poblacion: input.poblacion ?? null,
    provincia: input.provincia ?? null,
    metadata,
  }
}

export async function listProspectos(
  filters?: ListProspectosFilters
): Promise<VentasResult<Prospecto[]>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  let query = clientOrError.from("prospectos").select("*").order("updated_at", {
    ascending: false,
  })

  if (filters?.comercialId) query = query.eq("comercial_id", filters.comercialId)
  if (filters?.fase) query = query.eq("fase", filters.fase)

  const { data, error } = await query
  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as ProspectoRow[]).map(mapProspectoRow) }
}

export async function getProspecto(id: string): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data, error } = await clientOrError
    .from("prospectos")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) return mapSupabaseError(error)
  if (data) return { ok: true, data: mapProspectoRow(data as ProspectoRow) }

  const rpcResult = await clientOrError.rpc("get_prospecto_v1", { p_id: id })
  if (!rpcResult.error && rpcResult.data) {
    return { ok: true, data: mapProspectoRow(parseRpcProspectoRow(rpcResult.data)) }
  }

  return {
    ok: false,
    reason: "rls_denied",
    message: "Prospecto no encontrado o sin permiso de lectura.",
  }
}

export async function createProspecto(
  input: CreateProspectoInput
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data: sessionData } = await clientOrError.auth.getSession()
  if (!sessionData.session) {
    return {
      ok: false,
      reason: "rls_denied",
      message:
        "Sin sesión Supabase. Usa «Entrar al ERP» o Demo Acceso Rápido (no solo abrir la app). Si persiste, cierra sesión y vuelve a entrar con tu email corporativo.",
    }
  }

  const payload = buildProspectoInsert(input)
  const rpcResult = await clientOrError.rpc("insert_prospecto_v1", { payload })
  if (!rpcResult.error && rpcResult.data) {
    return { ok: true, data: mapProspectoRow(parseRpcProspectoRow(rpcResult.data)) }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("insert_prospecto_v1")

  if (!rpcMissing && rpcResult.error) return mapSupabaseError(rpcResult.error)

  const { data, error } = await clientOrError
    .from("prospectos")
    .insert(payload)
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapProspectoRow(data as ProspectoRow) }
}

export async function purgeDescartadosExpired(): Promise<VentasResult<number>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const rpcResult = await clientOrError.rpc("purge_descartados_expired_v1")
  if (!rpcResult.error) {
    const count = Number(rpcResult.data ?? 0)
    return { ok: true, data: Number.isFinite(count) ? count : 0 }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("purge_descartados_expired_v1")

  if (rpcMissing) return { ok: true, data: 0 }
  return mapSupabaseError(rpcResult.error)
}

export async function deleteProspecto(id: string): Promise<VentasResult<void>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const rpcResult = await clientOrError.rpc("delete_prospecto_v1", { p_id: id })
  if (!rpcResult.error && (rpcResult.data === true || rpcResult.data === "true")) {
    return { ok: true, data: undefined }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("delete_prospecto_v1")

  if (!rpcMissing && rpcResult.error) return mapSupabaseError(rpcResult.error)

  const { error } = await clientOrError.from("prospectos").delete().eq("id", id)
  if (error) return mapSupabaseError(error)
  return { ok: true, data: undefined }
}

export async function updateProspecto(
  id: string,
  patch: UpdateProspectoPatch
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  let existingMetadata: Record<string, unknown> | undefined
  if (patch.metadata === undefined) {
    const current = await getProspecto(id)
    if (current.ok) existingMetadata = current.data.metadata
  }

  const row = buildProspectoUpdateRow(patch, existingMetadata)
  if (Object.keys(row).length === 0) {
    return { ok: false, reason: "error", message: "Nada que actualizar." }
  }

  return persistProspectoUpdate(clientOrError, id, row)
}

export async function updateProspectoFase(
  id: string,
  input: UpdateProspectoFaseInput
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const current = await getProspecto(id)
  if (current.ok === false) return current

  const row = buildProspectoUpdateRow(input, current.data.metadata)
  return persistProspectoUpdate(clientOrError, id, row)
}
