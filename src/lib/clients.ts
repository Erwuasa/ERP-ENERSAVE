import type { Client, ClienteEstado, ClienteTipo } from "../types/client"
import type { Contract } from "../types/contract"
import { isContractActivado } from "./contract-estado"

export function inferTipoCliente(nombre: string, documento?: string): ClienteTipo {
  if (documento && /^[A-HJ-NP-SUVW]\d/i.test(documento)) return "empresa"
  if (/\b(S\.?L\.?|S\.?A\.?|S\.?L\.?U\.?|COOPERATIVA|SCP|CB)\b/i.test(nombre)) return "empresa"
  return "particular"
}

export function extractCodigoPostal(text?: string): string | undefined {
  if (!text) return undefined
  const m = text.match(/\b(\d{5})\b/)
  return m?.[1]
}

export function deriveClienteEstadoFromContracts(contractEstados: Contract["estado"][]): ClienteEstado {
  if (contractEstados.some((e) => isContractActivado(e))) return "activo"
  if (
    contractEstados.some((e) =>
      ["PTE DE FIRMA", "PTE DE TRAMITACIÓN", "TRAMITANDO", "INCIDENCIA ADMINISTRATIVA", "Borrador"].includes(
        e
      )
    )
  ) {
    return "pendiente"
  }
  return "inactivo"
}

export function normalizeClientDocumento(documento: string | null | undefined): string {
  return String(documento ?? "").replace(/[\s.-]/g, "").toUpperCase()
}

export function clientMatchKey(nombre: string, documento: string | undefined, comercialId: string): string {
  const doc = normalizeClientDocumento(documento)
  if (doc) return `${comercialId}|doc:${doc}`
  return `${comercialId}|name:${nombre.trim().toUpperCase()}`
}

export function findExistingClient(
  clients: Client[],
  input: { nombre: string; documento?: string; comercialId: string; clientId?: string }
): Client | undefined {
  if (input.clientId) {
    const byId = clients.find((client) => client.id === input.clientId)
    if (byId) return byId
  }

  const doc = normalizeClientDocumento(input.documento)
  if (doc) {
    const byDoc = clients.find((client) => normalizeClientDocumento(client.documento) === doc)
    if (byDoc) return byDoc
  }

  const key = clientMatchKey(input.nombre, input.documento, input.comercialId)
  const byKey = clients.find(
    (client) => clientMatchKey(client.nombre, client.documento, client.comercialId) === key
  )
  if (byKey) return byKey

  const nameKey = input.nombre.trim().toUpperCase()
  if (!nameKey) return undefined
  return clients.find(
    (client) =>
      client.comercialId === input.comercialId &&
      client.nombre.trim().toUpperCase() === nameKey
  )
}

const PERSISTED_CLIENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isPersistedClientId(id: string): boolean {
  return PERSISTED_CLIENT_ID_RE.test(id)
}

function clientCompleteness(client: Client): number {
  return [client.documento, client.email, client.telefono, client.direccion, client.ciudad].filter(Boolean)
    .length
}

function preferClient(a: Client, b: Client): Client {
  if (isPersistedClientId(a.id) !== isPersistedClientId(b.id)) {
    return isPersistedClientId(a.id) ? a : b
  }
  if (Boolean(normalizeClientDocumento(a.documento)) !== Boolean(normalizeClientDocumento(b.documento))) {
    return normalizeClientDocumento(a.documento) ? a : b
  }
  if (a.estado === "activo" && b.estado !== "activo") return a
  if (b.estado === "activo" && a.estado !== "activo") return b
  if (clientCompleteness(a) !== clientCompleteness(b)) {
    return clientCompleteness(a) > clientCompleteness(b) ? a : b
  }
  return a.createdAt <= b.createdAt ? a : b
}

function mergeClientRecord(winner: Client, loser: Client): Client {
  return {
    ...winner,
    documento: winner.documento || loser.documento,
    telefono: winner.telefono || loser.telefono,
    email: winner.email || loser.email,
    direccion: winner.direccion || loser.direccion,
    codigoPostal: winner.codigoPostal || loser.codigoPostal,
    ciudad: winner.ciudad || loser.ciudad,
    provincia: winner.provincia || loser.provincia,
    apellidos: winner.apellidos || loser.apellidos,
    atClientId: winner.atClientId || loser.atClientId,
    cups: winner.cups || loser.cups,
  }
}

/** Un cliente = un NIF. Nunca dos filas de la misma persona en cartera. */
export function dedupeClients(clients: Client[]): { clients: Client[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>()
  const uniqueById: Client[] = []
  const seenIds = new Set<string>()

  for (const client of clients) {
    if (!client.id || seenIds.has(client.id)) continue
    seenIds.add(client.id)
    uniqueById.push(client)
    idMap.set(client.id, client.id)
  }

  function collapse(list: Client[], keyOf: (client: Client) => string | null): Client[] {
    const groups = new Map<string, Client[]>()
    const passthrough: Client[] = []

    for (const client of list) {
      const key = keyOf(client)
      if (!key) {
        passthrough.push(client)
        continue
      }
      const group = groups.get(key) ?? []
      group.push(client)
      groups.set(key, group)
    }

    const collapsed: Client[] = [...passthrough]
    for (const group of groups.values()) {
      const winner = group.reduce((current, next) => preferClient(current, next))
      const merged = group.reduce((current, next) => mergeClientRecord(current, next), winner)
      collapsed.push(merged)
      for (const client of group) idMap.set(client.id, merged.id)
    }
    return collapsed
  }

  const byDocumento = collapse(uniqueById, (client) => {
    const doc = normalizeClientDocumento(client.documento)
    return doc || null
  })
  const byAtId = collapse(byDocumento, (client) => client.atClientId?.trim() || null)
  const byMatchKey = collapse(byAtId, (client) =>
    clientMatchKey(client.nombre, client.documento, client.comercialId)
  )
  const byNameWithoutDoc = collapse(byMatchKey, (client) => {
    if (normalizeClientDocumento(client.documento)) return null
    const name = client.nombre.trim().toUpperCase()
    return name ? `${client.comercialId}|name:${name}` : null
  })

  const resolved = new Map<string, string>()
  function resolveId(id: string): string {
    let current = id
    const seen = new Set<string>()
    while (idMap.has(current) && idMap.get(current) !== current && !seen.has(current)) {
      seen.add(current)
      current = idMap.get(current) ?? current
    }
    return current
  }
  for (const [from, to] of idMap) resolved.set(from, resolveId(to))

  return { clients: byNameWithoutDoc, idMap: resolved }
}

export function normalizeCups(cups: string | null | undefined): string {
  return String(cups ?? "").replace(/\s/g, "").toUpperCase()
}

function preferContract(a: Contract, b: Contract): Contract {
  const aTime = a.updatedAt || a.createdAt
  const bTime = b.updatedAt || b.createdAt
  return aTime >= bTime ? a : b
}

/** CUPS + tipo + estado + cliente. No mezcla suministros de personas distintas. */
export function contractSupplyKey(contract: Contract): string {
  const cups = normalizeCups(contract.cups)
  if (!cups) return `id:${contract.id}`
  const clientKey =
    contract.clientId ||
    normalizeClientDocumento(contract.nif) ||
    contract.clientName.trim().toUpperCase()
  return `${cups}|${contract.tipo}|${contract.estado}|${clientKey}`
}

/** Un contrato = un id. Un CUPS + tipo + estado del mismo cliente no se lista dos veces. */
export function dedupeContracts(contracts: Contract[]): Contract[] {
  const byId = new Map<string, Contract>()
  for (const contract of contracts) {
    if (!contract.id) continue
    const prev = byId.get(contract.id)
    byId.set(contract.id, prev ? preferContract(prev, contract) : contract)
  }

  const byAtId = new Map<string, Contract>()
  const withoutAt: Contract[] = []
  for (const contract of byId.values()) {
    const atId = contract.atContractId?.trim()
    if (!atId) {
      withoutAt.push(contract)
      continue
    }
    const prev = byAtId.get(atId)
    byAtId.set(atId, prev ? preferContract(prev, contract) : contract)
  }

  const bySupply = new Map<string, Contract>()
  for (const contract of [...byAtId.values(), ...withoutAt]) {
    const key = contractSupplyKey(contract)
    const prev = bySupply.get(key)
    bySupply.set(key, prev ? preferContract(prev, contract) : contract)
  }

  return Array.from(bySupply.values())
}

export interface UpsertClientInput {
  nombre: string
  comercialId: string
  documento?: string
  telefono?: string
  email?: string
  codigoPostal?: string
  ciudad?: string
  direccion?: string
  tipoCliente?: ClienteTipo
}

export function upsertClient(
  clients: Client[],
  input: UpsertClientInput
): { clients: Client[]; client: Client } {
  const existing = findExistingClient(clients, {
    nombre: input.nombre,
    documento: input.documento,
    comercialId: input.comercialId,
  })

  const cp = input.codigoPostal || extractCodigoPostal(input.direccion)

  if (existing) {
    const updated: Client = {
      ...existing,
      nombre: input.nombre.trim() || existing.nombre,
      documento: input.documento?.trim() || existing.documento,
      telefono: input.telefono?.trim() || existing.telefono,
      email: input.email?.trim() || existing.email,
      codigoPostal: cp || existing.codigoPostal,
      ciudad: input.ciudad?.trim() || existing.ciudad,
      tipoCliente: input.tipoCliente || existing.tipoCliente,
    }
    return {
      clients: clients.map((c) => (c.id === existing.id ? updated : c)),
      client: updated,
    }
  }

  const newClient: Client = {
    id: `cli-${Date.now()}`,
    nombre: input.nombre.trim(),
    estado: "pendiente",
    documento: input.documento?.trim(),
    telefono: input.telefono?.trim(),
    email: input.email?.trim(),
    codigoPostal: cp,
    ciudad: input.ciudad?.trim(),
    tipoCliente: input.tipoCliente || inferTipoCliente(input.nombre, input.documento),
    comercialId: input.comercialId,
    archivos: [],
    createdAt: new Date().toISOString().split("T")[0],
  }

  return { clients: [newClient, ...clients], client: newClient }
}

export function buildClientsFromContracts(contracts: Contract[]): Client[] {
  const groups = new Map<string, Contract[]>()

  for (const c of contracts) {
    const key = clientMatchKey(c.clientName, c.nif, c.comercialId)
    const list = groups.get(key) || []
    list.push(c)
    groups.set(key, list)
  }

  const result: Client[] = []
  let idx = 0
  for (const [, group] of groups) {
    const first = group[0]
    idx += 1
    result.push({
      id: `cli-${idx}`,
      nombre: first.clientName,
      estado: deriveClienteEstadoFromContracts(group.map((g) => g.estado)),
      documento: first.nif,
      telefono: first.telefono,
      email: first.email,
      codigoPostal: extractCodigoPostal(first.direccionSuministro || first.direccionCompleta),
      ciudad: undefined,
      tipoCliente: inferTipoCliente(first.clientName, first.nif),
      comercialId: first.comercialId,
      archivos: [],
      createdAt: first.createdAt,
    })
  }

  return result
}

export function syncClientEstados(clients: Client[], contracts: Contract[]): Client[] {
  return clients.map((client) => {
    const linked = contracts.filter(
      (c) =>
        c.comercialId === client.comercialId &&
        (c.clientId === client.id ||
          clientMatchKey(c.clientName, c.nif, c.comercialId) ===
            clientMatchKey(client.nombre, client.documento, client.comercialId))
    )
    if (linked.length === 0) return client
    return {
      ...client,
      estado: deriveClienteEstadoFromContracts(linked.map((c) => c.estado)),
    }
  })
}

export function linkContractsToClients(
  contracts: Contract[],
  clients: Client[]
): Contract[] {
  return contracts.map((c) => {
    if (c.clientId && clients.some((cl) => cl.id === c.clientId)) return c
    const match = findExistingClient(clients, {
      clientId: c.clientId,
      nombre: c.clientName,
      documento: c.nif,
      comercialId: c.comercialId,
    })
    return match ? { ...c, clientId: match.id } : c
  })
}

/** Une clientes de BD con los derivados de contratos, enlaza CUPS y sincroniza estados. */
export function mergeErpCrmState(
  clients: Client[],
  contracts: Contract[]
): { clients: Client[]; contracts: Contract[] } {
  const { clients: uniqueClients, idMap } = dedupeClients(clients)
  const remappedContracts = dedupeContracts(
    contracts.map((contract) => {
      const mappedId = contract.clientId ? idMap.get(contract.clientId) : undefined
      return mappedId && mappedId !== contract.clientId
        ? { ...contract, clientId: mappedId }
        : contract
    })
  )

  const byId = new Map(uniqueClients.map((client) => [client.id, client]))
  const mergedClients = [...uniqueClients]

  for (const contract of remappedContracts) {
    if (findExistingClient(mergedClients, {
      clientId: contract.clientId,
      nombre: contract.clientName,
      documento: contract.nif,
      comercialId: contract.comercialId,
    })) {
      continue
    }

    const [derived] = buildClientsFromContracts([contract])
    if (!derived) continue

    const uniqueId = `cli-${contract.id}`
    if (byId.has(uniqueId)) continue
    const withId = { ...derived, id: uniqueId }
    mergedClients.push(withId)
    byId.set(uniqueId, withId)
  }

  const { clients: collapsedClients, idMap: derivedIdMap } = dedupeClients(mergedClients)
  const linkedContracts = linkContractsToClients(
    remappedContracts.map((contract) => {
      const mappedId = contract.clientId ? derivedIdMap.get(contract.clientId) : undefined
      return mappedId && mappedId !== contract.clientId
        ? { ...contract, clientId: mappedId }
        : contract
    }),
    collapsedClients
  )
  const syncedClients = syncClientEstados(collapsedClients, linkedContracts)

  return { clients: syncedClients, contracts: dedupeContracts(linkedContracts) }
}

export function getContractsForClient(client: Client, contracts: Contract[]): Contract[] {
  return contracts.filter((c) => {
    if (c.clientId === client.id) return true
    if (client.documento && c.nif && client.documento.toUpperCase() === c.nif.toUpperCase()) {
      return true
    }
    if (!client.comercialId || !c.comercialId) return false
    return (
      c.comercialId === client.comercialId &&
      clientMatchKey(c.clientName, c.nif, c.comercialId) ===
        clientMatchKey(client.nombre, client.documento, client.comercialId)
    )
  })
}

export function clientDisplayName(client: Pick<Client, "nombre" | "apellidos">): string {
  return [client.nombre, client.apellidos].filter(Boolean).join(" ").trim() || client.nombre
}
