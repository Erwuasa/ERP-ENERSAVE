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
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
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

function applyServerFilters<T extends { eq: Function; not: Function; neq: Function; in: Function; gte: Function; lte: Function; or: Function }>(
  query: T,
  filters?: GeneralDatabaseFilters
): T {
  if (!filters) return query

  if (filters.segment) {
    query = query.eq("segment", filters.segment)
  }
  if (filters.provincia) {
    query = query.eq("provincia", filters.provincia)
  }
  if (filters.localidad) {
    query = query.eq("localidad", filters.localidad)
  }
  if (filters.cnae) {
    query = query.eq("cnae", filters.cnae)
  }
  if (filters.conTelefono) {
    query = query.not("telefono", "is", null).neq("telefono", "")
  }
  if (filters.conWeb) {
    query = query.not("direccion_web", "is", null).neq("direccion_web", "")
  }
  if (filters.soloPrioritarios) {
    query = query.in("source", ["campana", "web"])
  }
  if (filters.empleadosMin != null) {
    query = query.gte("numero_empleados", filters.empleadosMin)
  }
  if (filters.empleadosMax != null) {
    query = query.lte("numero_empleados", filters.empleadosMax)
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    query = query.or(
      [
        `nombre.ilike.${term}`,
        `sede.ilike.${term}`,
        `localidad.ilike.${term}`,
        `provincia.ilike.${term}`,
        `cnae.ilike.${term}`,
        `descripcion_actividad.ilike.${term}`,
        `telefono.ilike.${term}`,
      ].join(",")
    )
  }

  return query
}

export async function listGeneralDatabaseLeads(
  filters?: GeneralDatabaseFilters
): Promise<VentasResult<GeneralDatabaseLead[]>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  let query = client.from("general_database_leads").select("*")
  query = applyServerFilters(query, filters)

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as GeneralDatabaseLeadRow[]).map(mapRow) }
}

export async function listGeneralDatabaseDistinctValues(): Promise<
  VentasResult<{ provincias: string[]; localidades: string[]; cnaes: string[] }>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  const { data, error } = await client
    .from("general_database_leads")
    .select("provincia, localidad, cnae")

  if (error) return mapSupabaseError(error)

  const provincias = new Set<string>()
  const localidades = new Set<string>()
  const cnaes = new Set<string>()

  for (const row of data ?? []) {
    if (row.provincia?.trim()) provincias.add(row.provincia.trim())
    if (row.localidad?.trim()) localidades.add(row.localidad.trim())
    if (row.cnae?.trim()) cnaes.add(row.cnae.trim())
  }

  return {
    ok: true,
    data: {
      provincias: [...provincias].sort((a, b) => a.localeCompare(b, "es")),
      localidades: [...localidades].sort((a, b) => a.localeCompare(b, "es")),
      cnaes: [...cnaes].sort((a, b) => a.localeCompare(b, "es")),
    },
  }
}
