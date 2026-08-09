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

export function clientMatchKey(nombre: string, documento: string | undefined, comercialId: string): string {
  const doc = documento?.trim().toUpperCase()
  if (doc) return `${comercialId}|doc:${doc}`
  return `${comercialId}|name:${nombre.trim().toUpperCase()}`
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
  const key = clientMatchKey(input.nombre, input.documento, input.comercialId)
  const existing = clients.find(
    (c) => clientMatchKey(c.nombre, c.documento, c.comercialId) === key
  )

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
    if (c.clientId) return c
    const match = clients.find(
      (cl) =>
        clientMatchKey(c.clientName, c.nif, c.comercialId) ===
        clientMatchKey(cl.nombre, cl.documento, cl.comercialId)
    )
    return match ? { ...c, clientId: match.id } : c
  })
}

export function getContractsForClient(client: Client, contracts: Contract[]): Contract[] {
  return contracts.filter(
    (c) =>
      c.clientId === client.id ||
      (c.comercialId === client.comercialId &&
        clientMatchKey(c.clientName, c.nif, c.comercialId) ===
          clientMatchKey(client.nombre, client.documento, client.comercialId))
  )
}
