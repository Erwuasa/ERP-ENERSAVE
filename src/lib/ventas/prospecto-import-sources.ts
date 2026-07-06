import type { Client } from "../../types/client"
import type { Contract } from "../../types/contract"
import type { SubtipoProspecto } from "./types"

export interface ProspectoImportSource {
  id: string
  label: string
  nombre: string
  telefono: string
  email?: string
  cups?: string
  companiaActual?: string
  tarifaActual?: string
  consumoAnualKwh?: number
  subtipoProspecto: SubtipoProspecto
  sourceType: "contract" | "client"
}

const RECENT_CONTRACT_LIMIT = 25
const RECENT_DAYS = 120

function isRecentContract(createdAt: string): boolean {
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return true
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  return created.getTime() >= cutoff
}

/** Contratos ERP del comercial (cartera personal) — sincronizado ERP ↔ Ventas. */
export function buildPersonalPortfolioSources(
  contracts: Contract[],
  comercialId: string
): ProspectoImportSource[] {
  const sources: ProspectoImportSource[] = []

  const mine = contracts
    .filter((c) => c.comercialId === comercialId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  for (const contract of mine) {
    sources.push({
      id: `portfolio-${contract.id}`,
      label: `${contract.clientName} · ${contract.cups}`,
      nombre: contract.clientName,
      telefono: contract.telefono?.trim() || "600000000",
      email: contract.email,
      cups: contract.cups,
      companiaActual: contract.compania,
      tarifaActual: contract.tarifa,
      consumoAnualKwh: contract.consumoAnual,
      subtipoProspecto: "base_datos",
      sourceType: "contract",
    })
  }

  return sources
}

export function buildEnersaveLeadImportSources(leads: {
  id: string
  nombre: string
  empresa?: string
  telefono?: string
  email?: string
  cups?: string
  companiaActual?: string
  consumoAnualKwh?: number
}[]): ProspectoImportSource[] {
  return leads.map((lead) => ({
    id: `enersave-lead-${lead.id}`,
    label: `${lead.nombre}${lead.empresa ? ` · ${lead.empresa}` : ""}`,
    nombre: lead.nombre,
    telefono: lead.telefono?.trim() || "600000000",
    email: lead.email,
    cups: lead.cups,
    companiaActual: lead.companiaActual,
    consumoAnualKwh: lead.consumoAnualKwh,
    subtipoProspecto: "base_datos",
    sourceType: "client",
  }))
}

/** Contratos ERP recientes + clientes CRM para importar al pipeline. */
export function buildProspectoImportSources(
  contracts: Contract[],
  clients: Client[]
): ProspectoImportSource[] {
  const clientById = new Map(clients.map((c) => [c.id, c]))
  const sources: ProspectoImportSource[] = []

  const recentContracts = [...contracts]
    .filter((c) => isRecentContract(c.createdAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_CONTRACT_LIMIT)

  for (const contract of recentContracts) {
    const client = contract.clientId ? clientById.get(contract.clientId) : undefined
    const telefono =
      contract.telefono?.trim() || client?.telefono?.trim() || "600000000"
    sources.push({
      id: `contract-${contract.id}`,
      label: `${contract.clientName} · ${contract.cups}`,
      nombre: contract.clientName,
      telefono,
      email: contract.email ?? client?.email,
      cups: contract.cups,
      companiaActual: contract.compania,
      tarifaActual: contract.tarifa,
      consumoAnualKwh: contract.consumoAnual,
      subtipoProspecto: "base_datos",
      sourceType: "contract",
    })
  }

  for (const client of clients) {
    if (!client.nombre?.trim()) continue
    sources.push({
      id: `client-${client.id}`,
      label: `${client.nombre}${client.telefono ? ` · ${client.telefono}` : ""}`,
      nombre: client.nombre,
      telefono: client.telefono?.trim() || "600000000",
      email: client.email,
      subtipoProspecto: "base_datos",
      sourceType: "client",
    })
  }

  return sources
}
