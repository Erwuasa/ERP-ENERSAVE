import { getVisibleClientsForRole, matchesClientSearch, foldSearchText } from "./clientes-panel-filters"
import { splitClientNameToParts, type NewContractFormState } from "./contract-registration"
import type { Client } from "../types/client"

export type ClientPortfolioRole = "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"

export function parseClientPortfolioRole(role: string): ClientPortfolioRole {
  if (
    role === "superadmin" ||
    role === "jefe_comercial" ||
    role === "comercial" ||
    role === "tramitacion"
  ) {
    return role
  }
  return "comercial"
}

export function shouldScopeClientSearchToComercial(role: ClientPortfolioRole): boolean {
  return role === "comercial" || role === "jefe_comercial"
}

export function visiblePortfolioClients(options: {
  clients: Client[]
  activeRole: string
  activeUserId: string
  teamMemberIds?: string[]
}): Client[] {
  return getVisibleClientsForRole(
    options.clients,
    parseClientPortfolioRole(options.activeRole),
    options.activeUserId,
    options.teamMemberIds ?? []
  )
}

export function rankPortfolioMatches(clients: Client[], query: string, limit = 12): Client[] {
  const q = foldSearchText(query)
  if (!q) return clients.slice(0, Math.min(8, limit))

  return clients
    .map((client) => {
      if (!matchesClientSearch(client, query)) return null
      const name = foldSearchText(client.nombre)
      const documento = foldSearchText(client.documento ?? "")
      let score = 40
      if (name === q || documento === q) score = 100
      else if (name.startsWith(q) || documento.startsWith(q)) score = 80
      else if (name.includes(q)) score = 60
      return { client, score }
    })
    .filter((entry): entry is { client: Client; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score || a.client.nombre.localeCompare(b.client.nombre, "es"))
    .slice(0, limit)
    .map((entry) => entry.client)
}

export function clientToContractFormPatch(client: Client): Partial<NewContractFormState> {
  const { clientNombre, clientApellidos } = splitClientNameToParts(client.nombre)
  return {
    clientName: client.nombre,
    clientNombre,
    clientApellidos: client.apellidos || clientApellidos,
    nif: client.documento ?? "",
    telefono: client.telefono ?? "",
    email: client.email ?? "",
    codigoPostal: client.codigoPostal ?? "",
    poblacion: client.ciudad ?? "",
    direccionFiscal: client.direccion ?? "",
    tipoCliente: client.tipoCliente === "empresa" ? "pyme" : "residencial",
    razonSocial: client.tipoCliente === "empresa" ? client.nombre : "",
  }
}
