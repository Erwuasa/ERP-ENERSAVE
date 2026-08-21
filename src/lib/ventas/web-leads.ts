import type { SlaUrgencia } from "./pipeline"
import type { VentasActor, VentasRole } from "./hooks/types"
import { canAssignWebLeads } from "./hooks/types"

export interface WebLead {
  id: string
  createdAt: string
  updatedAt: string
  nombre: string
  telefono: string
  email?: string
  leadSource?: string
  facturasUrls: string[]
  cups?: string
  selectedTariffId?: string
  status?: string
  fiscalAddress?: string
  supplyAddress?: string
  billingPeriod?: string
  zipCode?: string
  city?: string
  currentCompany?: string
  currentTariffType?: string
  estimatedSavingMonthlyEur?: number
  estimatedSavingPercentage?: number
  fromWeb: boolean
  erpPriority: number
  assignedComercialId?: string
  assignedByComercialId?: string
  assignedAt?: string
  prospectoId?: string
  slaDueAt?: string
  resubmittedAt?: string
}

export type WebLeadInboxFilter = "all" | "unassigned" | "mine" | "resubmitted"

export interface WebLeadListFilters {
  search?: string
  inbox?: WebLeadInboxFilter
}

const WARNING_RATIO = 0.8

export function getWebLeadSlaUrgencia(
  slaDueAt: string | undefined,
  referenceDate: Date = new Date()
): SlaUrgencia {
  if (!slaDueAt) return "na"
  const dueMs = new Date(slaDueAt).getTime()
  const nowMs = referenceDate.getTime()
  if (nowMs >= dueMs) return "breach"
  const createdEstimateMs = dueMs - 2 * 3_600_000
  const windowMs = dueMs - createdEstimateMs
  if (windowMs > 0 && nowMs >= dueMs - windowMs * (1 - WARNING_RATIO)) return "warning"
  return "ok"
}

export function formatWebLeadSlaLabel(slaDueAt: string | undefined): string {
  if (!slaDueAt) return "—"
  const dueMs = new Date(slaDueAt).getTime()
  const diffMin = Math.round((dueMs - Date.now()) / 60_000)
  if (diffMin < 0) return `Vencido ${Math.abs(diffMin)} min`
  if (diffMin < 60) return `${diffMin} min`
  const hours = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function formatSavingMonthly(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${value.toFixed(2)} €/mes`
}

export function filterWebLeads(
  leads: WebLead[],
  filters: WebLeadListFilters,
  actor?: VentasActor
): WebLead[] {
  const search = filters.search?.trim().toLowerCase()
  const inbox = filters.inbox ?? "all"

  return leads.filter((lead) => {
    if (inbox === "unassigned" && lead.assignedComercialId) return false
    if (inbox === "mine" && actor && lead.assignedComercialId !== actor.comercialId) return false
    if (inbox === "resubmitted" && !lead.resubmittedAt) return false

    if (!search) return true
    const haystack = [
      lead.nombre,
      lead.telefono,
      lead.email,
      lead.cups,
      lead.city,
      lead.currentCompany,
      lead.leadSource,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return haystack.includes(search)
  })
}

export function canConvertWebLead(actor: VentasActor, lead: WebLead): boolean {
  if (lead.prospectoId) return false
  if (!lead.assignedComercialId) return false
  if (canAssignWebLeads(actor.role)) return true
  return lead.assignedComercialId === actor.comercialId
}

export function countWebLeadInboxStats(leads: WebLead[]): {
  total: number
  unassigned: number
  slaBreach: number
  resubmitted: number
} {
  let unassigned = 0
  let slaBreach = 0
  let resubmitted = 0
  for (const lead of leads) {
    if (!lead.assignedComercialId) unassigned += 1
    if (getWebLeadSlaUrgencia(lead.slaDueAt) === "breach") slaBreach += 1
    if (lead.resubmittedAt) resubmitted += 1
  }
  return { total: leads.length, unassigned, slaBreach, resubmitted }
}

export function assignableComercialRoles(): VentasRole[] {
  return ["comercial", "jefe_comercial"]
}
