import type {
  GeneralDatabaseFilters,
  GeneralDatabaseLead,
} from "../../types/general-database"
import { getSupabaseClient, isSupabaseConfigured } from "./client"
import type { VentasResult } from "./ventas"

interface GeneralDatabaseLeadRow {
  id: string
  nombre: string
  sede: string | null
  numero_adm_seg_social: string | null
  numero_empleados: number | null
  cnae: string | null
  codigo_postal: string | null
  localidad: string | null
  provincia: string | null
  telefono: string | null
  direccion_web: string | null
  codigo_ine: string | null
  descripcion_actividad: string | null
  segment: GeneralDatabaseLead["segment"]
  source: GeneralDatabaseLead["source"]
  created_at: string
}

export interface GeneralDatabaseFilterOptions {
  provincias: string[]
  localidades: string[]
  cnaes: string[]
}

export interface GeneralDatabaseListPayload {
  leads: GeneralDatabaseLead[]
  filterOptions: GeneralDatabaseFilterOptions
}

function mapRow(row: GeneralDatabaseLeadRow): GeneralDatabaseLead {
  return {
    id: row.id,
    nombre: row.nombre,
    sede: row.sede ?? undefined,
    numeroAdmSegSocial: row.numero_adm_seg_social ?? undefined,
    numeroEmpleados: row.numero_empleados ?? undefined,
    cnae: row.cnae ?? undefined,
    codigoPostal: row.codigo_postal ?? undefined,
    localidad: row.localidad ?? undefined,
    provincia: row.provincia ?? undefined,
    telefono: row.telefono ?? undefined,
    direccionWeb: row.direccion_web ?? undefined,
    codigoIne: row.codigo_ine ?? undefined,
    descripcionActividad: row.descripcion_actividad ?? undefined,
    segment: row.segment,
    source: row.source,
    createdAt: row.created_at,
  }
}

function mapSupabaseError(error: { message: string }): VentasResult<never> {
  const msg = error.message ?? "Error de Supabase"
  if (msg.includes("does not exist") || msg.includes("relation")) {
    return { ok: false, reason: "table_missing", message: msg }
  }
  if (msg.toLowerCase().includes("policy") || msg.includes("RLS")) {
    return { ok: false, reason: "rls_denied", message: msg }
  }
  return { ok: false, reason: "error", message: msg }
}

function emptyFilterOptions(): GeneralDatabaseFilterOptions {
  return { provincias: [], localidades: [], cnaes: [] }
}

export async function listGeneralDatabaseLeads(
  filters?: GeneralDatabaseFilters
): Promise<VentasResult<GeneralDatabaseListPayload>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: "not_configured", message: "Cliente Supabase no disponible" }

  const { data, error } = await client.rpc("list_general_database_leads_v1", {
    p_search: filters?.search?.trim() || null,
    p_segment: filters?.segment || null,
    p_provincia: filters?.provincia || null,
    p_localidad: filters?.localidad || null,
    p_cnae: filters?.cnae || null,
    p_con_telefono: filters?.conTelefono ?? false,
    p_con_web: filters?.conWeb ?? false,
    p_solo_prioritarios: filters?.soloPrioritarios ?? false,
    p_empleados_min: filters?.empleadosMin ?? null,
    p_empleados_max: filters?.empleadosMax ?? null,
    p_limit: 200,
    p_offset: 0,
  })

  if (error) return mapSupabaseError(error)

  const payload = (data ?? {}) as {
    rows?: GeneralDatabaseLeadRow[]
    filter_options?: GeneralDatabaseFilterOptions
  }

  return {
    ok: true,
    data: {
      leads: (payload.rows ?? []).map(mapRow),
      filterOptions: payload.filter_options ?? emptyFilterOptions(),
    },
  }
}

export async function listGeneralDatabaseDistinctValues(): Promise<
  VentasResult<GeneralDatabaseFilterOptions>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: "not_configured", message: "Cliente Supabase no disponible" }

  const { data, error } = await client.rpc("list_general_database_filter_options_v1")
  if (error) return mapSupabaseError(error)

  const payload = (data ?? {}) as Partial<GeneralDatabaseFilterOptions>
  return {
    ok: true,
    data: {
      provincias: payload.provincias ?? [],
      localidades: payload.localidades ?? [],
      cnaes: payload.cnaes ?? [],
    },
  }
}

export async function listImportedGeneralDatabaseLeadIds(): Promise<VentasResult<string[]>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: "not_configured", message: "Cliente Supabase no disponible" }

  const { data, error } = await client
    .from("prospectos")
    .select("id, metadata")
    .not("metadata->general_database_lead_id", "is", null)

  if (error) return mapSupabaseError(error)

  const ids = new Set<string>()
  for (const row of data ?? []) {
    const leadId = (row.metadata as Record<string, unknown> | null)?.general_database_lead_id
    if (typeof leadId === "string" && leadId.trim()) ids.add(leadId)
  }

  return { ok: true, data: [...ids] }
}
