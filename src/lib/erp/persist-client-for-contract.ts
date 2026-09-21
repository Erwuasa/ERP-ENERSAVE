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
 * Encuentra o crea el cliente ligado a un contrato.
 * Un NIF identifica a la misma persona en toda la cartera.
 */
export async function ensureClientForContract(
  clients: Client[],
  input: UpsertClientInput
): Promise<{ clients: Client[]; client: Client }> {
  const { clients: afterLocal, client: localClient } = upsertClient(clients, input)
  const uniqueLocal = dedupeClients(afterLocal)
  const uniqueClient =
    uniqueLocal.idMap.get(localClient.id)
      ? uniqueLocal.clients.find((client) => client.id === uniqueLocal.idMap.get(localClient.id)) ??
        localClient
      : localClient

  if (!isSupabaseConfigured() || isPersistedClientId(uniqueClient.id)) {
    return { clients: uniqueLocal.clients, client: uniqueClient }
  }

  if (uniqueClient.documento?.trim()) {
    const byDocumento = await findClienteByDocumento(uniqueClient.documento)
    if (byDocumento.ok && byDocumento.data) {
      return {
        clients: replaceLocalClient(uniqueLocal.clients, uniqueClient.id, byDocumento.data),
        client: byDocumento.data,
      }
    }
  }

  const lookupQuery = uniqueClient.documento?.trim() || uniqueClient.nombre.trim()
  if (lookupQuery) {
    const found = await searchClientes({
      query: lookupQuery,
      comercialId: uniqueClient.comercialId,
      limit: 12,
    })
    if (found.ok) {
      const existing = findExistingClient(found.data, {
        nombre: uniqueClient.nombre,
        documento: uniqueClient.documento,
        comercialId: uniqueClient.comercialId,
      })
      if (existing) {
        return {
          clients: replaceLocalClient(uniqueLocal.clients, uniqueClient.id, existing),
          client: existing,
        }
      }
    }
  }

  const result = await createCliente(uniqueClient)
  if (!result.ok) {
    return { clients: uniqueLocal.clients, client: uniqueClient }
  }

  return {
    clients: replaceLocalClient(uniqueLocal.clients, uniqueClient.id, result.data),
    client: result.data,
  }
}
