import type {
  CreateEnersaveLeadInput,
  EnersaveLead,
} from "../ventas/enersave-leads"
import { getSupabaseClient, isSupabaseConfigured } from "./client"
import type { VentasResult } from "./ventas"

interface EnersaveLeadRow {
  id: string
  nombre: string
  empresa: string | null
  telefono: string | null
  email: string | null
  sector: string | null
  provincia: string | null
  codigo_postal: string | null
  cups: string | null
  consumo_anual_kwh: number | null
  compania_actual: string | null
  notas: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

function mapRow(row: EnersaveLeadRow): EnersaveLead {
  return {
    id: row.id,
    nombre: row.nombre,
    empresa: row.empresa ?? undefined,
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    sector: row.sector ?? undefined,
    provincia: row.provincia ?? undefined,
    codigoPostal: row.codigo_postal ?? undefined,
    cups: row.cups ?? undefined,
    consumoAnualKwh: row.consumo_anual_kwh ?? undefined,
    companiaActual: row.compania_actual ?? undefined,
    notas: row.notas ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export async function listEnersaveLeads(): Promise<VentasResult<EnersaveLead[]>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  const { data, error } = await client
    .from("enersave_leads")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as EnersaveLeadRow[]).map(mapRow) }
}

export async function createEnersaveLead(
  input: CreateEnersaveLeadInput
): Promise<VentasResult<EnersaveLead>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  const { data, error } = await client
    .from("enersave_leads")
    .insert({
      nombre: input.nombre,
      empresa: input.empresa,
      telefono: input.telefono,
      email: input.email,
      sector: input.sector,
      provincia: input.provincia,
      codigo_postal: input.codigoPostal,
      cups: input.cups,
      consumo_anual_kwh: input.consumoAnualKwh,
      compania_actual: input.companiaActual,
      notas: input.notas,
    })
    .select()
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapRow(data as EnersaveLeadRow) }
}

export async function bulkCreateEnersaveLeads(
  inputs: CreateEnersaveLeadInput[]
): Promise<VentasResult<EnersaveLead[]>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }
  if (inputs.length === 0) return { ok: true, data: [] }

  const client = getSupabaseClient()
  const rows = inputs.map((input) => ({
    nombre: input.nombre,
    empresa: input.empresa,
    telefono: input.telefono,
    email: input.email,
    sector: input.sector,
    provincia: input.provincia,
    codigo_postal: input.codigoPostal,
    cups: input.cups,
    consumo_anual_kwh: input.consumoAnualKwh,
    compania_actual: input.companiaActual,
    notas: input.notas,
  }))

  const { data, error } = await client.from("enersave_leads").insert(rows).select()
  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as EnersaveLeadRow[]).map(mapRow) }
}

export async function deleteEnersaveLead(id: string): Promise<VentasResult<null>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured", message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  const { error } = await client.from("enersave_leads").delete().eq("id", id)
  if (error) return mapSupabaseError(error)
  return { ok: true, data: null }
}
