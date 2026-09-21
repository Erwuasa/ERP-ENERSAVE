import {
  dedupeClients,
  findExistingClient,
  upsertClient,
  type UpsertClientInput,
} from "@/lib/clients"
import { createCliente, findClienteByDocumento, searchClientes } from "@/lib/supabase/clientes"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { Client } from "@/types/client"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isPersistedClientId(id: string): boolean {
  return UUID_RE.test(id)
}

function replaceLocalClient(
  clients: Client[],
  localId: string,
  existing: Client
): Client[] {
  const replaced = clients.map((client) => (client.id === localId ? existing : client))
  const hasExisting = replaced.some((client) => client.id === existing.id)
  const next = hasExisting
    ? replaced
    : [existing, ...replaced.filter((client) => client.id !== localId)]
  return dedupeClients(next).clients
}

/**
 * Encuentra o crea el cliente en la cartera del usuario que carga el contrato.
 * Si ya tiene el mismo cliente (mismo NIF o mismos datos), se reutiliza.
 */
export async function ensureClientForContract(
  clients: Client[],
  input: UpsertClientInput
): Promise<{ clients: Client[]; client: Client }> {
  const cartera = clients.filter((client) => client.comercialId === input.comercialId)
  const others = clients.filter((client) => client.comercialId !== input.comercialId)
  const { clients: afterCartera, client: localClient } = upsertClient(cartera, input)
  const combined = [...afterCartera, ...others]

  if (!isSupabaseConfigured()) {
    return { clients: dedupeClients(combined).clients, client: localClient }
  }

  if (isPersistedClientId(localClient.id) && localClient.comercialId === input.comercialId) {
    return { clients: dedupeClients(combined).clients, client: localClient }
  }

  if (localClient.documento?.trim()) {
    const byDocumento = await findClienteByDocumento(localClient.documento, {
      comercialId: input.comercialId,
    })
    if (byDocumento.ok && byDocumento.data) {
      return {
        clients: replaceLocalClient(combined, localClient.id, byDocumento.data),
        client: byDocumento.data,
      }
    }
  }

  const lookupQuery = localClient.documento?.trim() || localClient.nombre.trim()
  if (lookupQuery) {
    const found = await searchClientes({
      query: lookupQuery,
      comercialId: input.comercialId,
      limit: 12,
    })
    if (found.ok) {
      const existing = findExistingClient(found.data, {
        nombre: localClient.nombre,
        documento: localClient.documento,
        comercialId: input.comercialId,
      })
      if (existing) {
        return {
          clients: replaceLocalClient(combined, localClient.id, existing),
          client: existing,
        }
      }
    }
  }

  const result = await createCliente({
    ...localClient,
    comercialId: input.comercialId,
  })
  if (!result.ok) {
    return { clients: dedupeClients(combined).clients, client: localClient }
  }

  return {
    clients: replaceLocalClient(combined, localClient.id, result.data),
    client: result.data,
  }
}
