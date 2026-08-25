import { getSupabaseClient, isSupabaseConfigured } from "./client"
import { signFacturaPaths } from "./facturas-storage"

export interface CustomerLead {
  id: string
  createdAt: string
  nombre: string
  cups: string | null
  facturasUrls: string[]
  tariffName: string | null
  providerName: string | null
  estimatedSavingMonthlyEur: number | null
  estimatedSavingPercentage: number | null
  status: string | null
  leadSource: string | null
}

export type CustomerLeadsResult =
  | { ok: true; data: CustomerLead[] }
  | { ok: false; message: string }

function parseFacturasUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

export async function listOwnCustomerLeads(): Promise<CustomerLeadsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }
  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) {
    return { ok: false, message: userError?.message ?? "Sin sesión" }
  }

  const { data, error } = await client
    .from("leads")
    .select(
      "id, created_at, nombre, cups, facturas_urls, estimated_saving_monthly_eur, estimated_saving_percentage, status, lead_source, tariffs ( name, providers ( name ) )"
    )
    .eq("auth_user_id", userData.user.id)
    .order("created_at", { ascending: false })

  if (error) return { ok: false, message: error.message }

  const rows = (data ?? []) as unknown as Array<{
    id: string
    created_at: string
    nombre: string
    cups: string | null
    facturas_urls: unknown
    estimated_saving_monthly_eur: number | null
    estimated_saving_percentage: number | null
    status: string | null
    lead_source: string | null
    tariffs: { name: string; providers: { name: string } | { name: string }[] | null } | null
  }>

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const tariff = row.tariffs
      const provider = tariff?.providers
      const providerName = Array.isArray(provider) ? provider[0]?.name : provider?.name
      const facturasUrls = await signFacturaPaths(client, parseFacturasUrls(row.facturas_urls))
      return {
        id: row.id,
        createdAt: row.created_at,
        nombre: row.nombre,
        cups: row.cups,
        facturasUrls,
        tariffName: tariff?.name ?? null,
        providerName: providerName ?? null,
        estimatedSavingMonthlyEur: row.estimated_saving_monthly_eur,
        estimatedSavingPercentage: row.estimated_saving_percentage,
        status: row.status,
        leadSource: row.lead_source,
      }
    })
  )

  return { ok: true, data: mapped }
}
