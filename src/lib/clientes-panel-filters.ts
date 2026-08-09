import { marcoRetributivoCatalog } from "../data/marco-retributivo-catalog"
import type { Client } from "../types/client"
import type { Contract } from "../types/contract"
import { getContractsForClient } from "./clients"
import { isContractActivado } from "./contract-estado"

export type ClienteTipoFilter = "todos" | "particular" | "empresa"
export type ClienteAceptacionFilter = "todos" | "aceptado" | "pendiente"

export type ClienteSortField = "nombre" | "alta" | "documento"
export type SortDirection = "asc" | "desc"

export function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

export function getClienteEstadoAceptacion(
  client: Client
): "aceptado" | "pendiente" {
  return client.estado === "activo" ? "aceptado" : "pendiente"
}

export function matchesClientSearch(client: Client, query: string): boolean {
  if (!query.trim()) return true
  const q = foldSearchText(query)
  const haystack = [
    client.nombre,
    client.documento,
    client.telefono,
    client.email,
    client.ciudad,
    client.codigoPostal,
  ]
    .filter(Boolean)
    .map((v) => foldSearchText(String(v)))
  return haystack.some((v) => v.includes(q))
}

export function getVisibleClientsForRole(
  clients: Client[],
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion",
  activeUserId: string,
  teamMemberIds: string[],
  options?: { superadminComercialScope?: boolean }
): Client[] {
  if (activeRole === "superadmin") {
    if (options?.superadminComercialScope) {
      return clients.filter((c) => c.comercialId === activeUserId)
    }
    return clients
  }
  if (activeRole === "tramitacion") return clients
  if (activeRole === "jefe_comercial") {
    const teamIds = new Set([activeUserId, ...teamMemberIds])
    return clients.filter((c) => teamIds.has(c.comercialId))
  }
  return clients.filter((c) => c.comercialId === activeUserId)
}

export function applyClientesPanelFilters(
  clients: Client[],
  opts: {
    searchQuery: string
    tipoFilter: ClienteTipoFilter
    aceptacionFilter: ClienteAceptacionFilter
    skipTipo?: boolean
    skipAceptacion?: boolean
  }
): Client[] {
  return clients.filter((client) => {
    if (!matchesClientSearch(client, opts.searchQuery)) return false
    if (
      !opts.skipTipo &&
      opts.tipoFilter !== "todos" &&
      client.tipoCliente !== opts.tipoFilter
    ) {
      return false
    }
    if (
      !opts.skipAceptacion &&
      opts.aceptacionFilter !== "todos" &&
      getClienteEstadoAceptacion(client) !== opts.aceptacionFilter
    ) {
      return false
    }
    return true
  })
}

export function countClientesByTipo(
  clients: Client[]
): Record<ClienteTipoFilter, number> {
  const particulares = clients.filter((c) => c.tipoCliente === "particular").length
  const pymes = clients.filter((c) => c.tipoCliente === "empresa").length
  return {
    todos: clients.length,
    particular: particulares,
    empresa: pymes,
  }
}

export function countClientesByAceptacion(
  clients: Client[]
): Record<ClienteAceptacionFilter, number> {
  const aceptados = clients.filter(
    (c) => getClienteEstadoAceptacion(c) === "aceptado"
  ).length
  const pendientes = clients.filter(
    (c) => getClienteEstadoAceptacion(c) === "pendiente"
  ).length
  return {
    todos: clients.length,
    aceptado: aceptados,
    pendiente: pendientes,
  }
}

export function countContratosActivosForClients(
  clients: Client[],
  contracts: Contract[]
): number {
  const seen = new Set<string>()
  let count = 0
  for (const client of clients) {
    for (const c of getContractsForClient(client, contracts)) {
      if (isContractActivado(c.estado) && !seen.has(c.id)) {
        seen.add(c.id)
        count += 1
      }
    }
  }
  return count
}

export function getClientProvincia(client: Client, contracts: Contract[]): string {
  const linked = getContractsForClient(client, contracts)
  for (const c of linked) {
    if (c.provincia?.trim()) return c.provincia.trim()
  }
  for (const c of linked) {
    const match = c.direccionCompleta?.match(/\(([^)]+)\)\s*$/)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return "—"
}

export function getClientTerminos(client: Client, contracts: Contract[]): string {
  const linked = getContractsForClient(client, contracts)
  const activated = linked.find((c) => isContractActivado(c.estado))
  if (activated?.marcoEntryId) {
    const entry = marcoRetributivoCatalog.find((e) => e.id === activated.marcoEntryId)
    if (entry?.condiciones) {
      const permanencia = entry.condiciones.match(/permanencia[^.]*/i)
      if (permanencia) return permanencia[0]
      if (/sin permanencia/i.test(entry.condiciones)) return "Sin permanencia"
      return entry.condiciones.length > 36
        ? `${entry.condiciones.slice(0, 36)}…`
        : entry.condiciones
    }
  }
  if (client.estado === "activo") return "Aceptado"
  if (client.estado === "pendiente") return "Pendiente"
  return "—"
}

export function formatClientContact(client: Client): string {
  const parts = [client.telefono, client.email].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : "—"
}

export function sortClients(
  clients: Client[],
  field: ClienteSortField,
  direction: SortDirection
): Client[] {
  const sorted = [...clients].sort((a, b) => {
    let cmp = 0
    if (field === "nombre") {
      cmp = a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
    } else if (field === "alta") {
      cmp = a.createdAt.localeCompare(b.createdAt)
    } else {
      cmp = (a.documento ?? "").localeCompare(b.documento ?? "", "es", {
        sensitivity: "base",
      })
    }
    return direction === "asc" ? cmp : -cmp
  })
  return sorted
}
