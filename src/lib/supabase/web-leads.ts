import { mapProspectoRow } from "./ventas-prospectos"
import type { Prospecto } from "../ventas/types"
import type { WebLead } from "../ventas/web-leads"
import { isVentasFailure, mapSupabaseError, requireSupabase, type VentasResult } from "./ventas-shared"
import type { ProspectoRow } from "./ventas-types"
import { signFacturaPaths } from "./facturas-storage"

interface WebLeadRow {
  id: string
  created_at: string
  updated_at: string
  nombre: string
  telefono: string
  email: string | null
  lead_source: string | null
  facturas_urls: unknown
  cups: string | null
  selected_tariff_id: string | null
  status: string | null
  fiscal_address: string | null
  supply_address: string | null
  billing_period: string | null
  zip_code: string | null
  city: string | null
  current_company: string | null
  current_tariff_type: string | null
  estimated_saving_monthly_eur: number | null
  estimated_saving_percentage: number | null
  from_web: boolean
  erp_priority: number
  assigned_comercial_id: string | null
  assigned_by_comercial_id: string | null
  assigned_at: string | null
  prospecto_id: string | null
  sla_due_at: string | null
  resubmitted_at: string | null
}

function parseFacturasUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function mapRow(row: WebLeadRow): WebLead {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nombre: row.nombre,
    telefono: row.telefono,
    email: row.email ?? undefined,
    leadSource: row.lead_source ?? undefined,
    facturasUrls: parseFacturasUrls(row.facturas_urls),
    cups: row.cups ?? undefined,
    selectedTariffId: row.selected_tariff_id ?? undefined,
    status: row.status ?? undefined,
    fiscalAddress: row.fiscal_address ?? undefined,
    supplyAddress: row.supply_address ?? undefined,
    billingPeriod: row.billing_period ?? undefined,
    zipCode: row.zip_code ?? undefined,
    city: row.city ?? undefined,
    currentCompany: row.current_company ?? undefined,
    currentTariffType: row.current_tariff_type ?? undefined,
    estimatedSavingMonthlyEur: row.estimated_saving_monthly_eur ?? undefined,
    estimatedSavingPercentage: row.estimated_saving_percentage ?? undefined,
    fromWeb: row.from_web,
    erpPriority: row.erp_priority,
    assignedComercialId: row.assigned_comercial_id ?? undefined,
    assignedByComercialId: row.assigned_by_comercial_id ?? undefined,
    assignedAt: row.assigned_at ?? undefined,
    prospectoId: row.prospecto_id ?? undefined,
    slaDueAt: row.sla_due_at ?? undefined,
    resubmittedAt: row.resubmitted_at ?? undefined,
  }
}

export async function listWebLeadsInbox(): Promise<VentasResult<WebLead[]>> {
  const client = requireSupabase()
  if (isVentasFailure(client)) return client

  const { data, error } = await client
    .from("leads")
    .select("*")
    .is("prospecto_id", null)
    .not("status", "eq", "convertido")
    .not("status", "eq", "descartado")
    .order("erp_priority", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) return mapSupabaseError(error)
  const rows = (data as WebLeadRow[]).map(mapRow)
  const signed = await Promise.all(
    rows.map(async (lead) => ({
      ...lead,
      facturasUrls: await signFacturaPaths(client, lead.facturasUrls),
    }))
  )
  return { ok: true, data: signed }
}

export async function assignWebLead(
  leadId: string,
  comercialId: string
): Promise<VentasResult<WebLead>> {
  const client = requireSupabase()
  if (isVentasFailure(client)) return client

  const { data, error } = await client.rpc("assign_web_lead_v1", {
    p_lead_id: leadId,
    p_comercial_id: comercialId,
  })

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapRow(data as WebLeadRow) }
}

export async function convertWebLeadToProspecto(
  leadId: string
): Promise<VentasResult<{ lead: WebLead; prospecto: Prospecto }>> {
  const client = requireSupabase()
  if (isVentasFailure(client)) return client

  const { data, error } = await client.rpc("convert_web_lead_to_prospecto_v1", {
    p_lead_id: leadId,
  })

  if (error) return mapSupabaseError(error)

  const payload = data as { lead?: WebLeadRow; prospecto?: ProspectoRow }
  if (!payload?.lead || !payload?.prospecto) {
    return { ok: false, reason: "error", message: "Respuesta RPC inválida" }
  }

  return {
    ok: true,
    data: {
      lead: mapRow(payload.lead),
      prospecto: mapProspectoRow(payload.prospecto),
    },
  }
}
