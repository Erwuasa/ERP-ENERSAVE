import { clientMatchKey, upsertClient, type UpsertClientInput } from "@/lib/clients"
import { createCliente, searchClientes } from "@/lib/supabase/clientes"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { Client } from "@/types/client"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isPersistedClientId(id: string): boolean {
  return UUID_RE.test(id)
}

/**
 * Encuentra o crea el cliente ligado a un contrato.
 * - Si ya existe en memoria/BD (mismo comercial + NIF o nombre), reutiliza.
 * - Si no existe y Supabase está activo, persiste en `clientes`.
 */
export async function ensureClientForContract(
  clients: Client[],
  input: UpsertClientInput
): Promise<{ clients: Client[]; client: Client }> {
  const { clients: afterLocal, client: localClient } = upsertClient(clients, input)

  if (!isSupabaseConfigured() || isPersistedClientId(localClient.id)) {
    return { clients: afterLocal, client: localClient }
  }

  const lookupQuery = localClient.documento?.trim() || localClient.nombre.trim()
  if (lookupQuery) {
    const found = await searchClientes({
      query: lookupQuery,
      comercialId: localClient.comercialId,
      limit: 12,
    })
    if (found.ok) {
      const key = clientMatchKey(localClient.nombre, localClient.documento, localClient.comercialId)
      const existing = found.data.find(
        (c) => clientMatchKey(c.nombre, c.documento, c.comercialId) === key
      )
      if (existing) {
        const clientsWithExisting = afterLocal.map((c) =>
          c.id === localClient.id ? existing : c
        )
        const hasExisting = clientsWithExisting.some((c) => c.id === existing.id)
        return {
          clients: hasExisting ? clientsWithExisting : [existing, ...clientsWithExisting.filter((c) => c.id !== localClient.id)],
          client: existing,
        }
      }
    }
  }

  const result = await createCliente(localClient)
  if (!result.ok) {
    return { clients: afterLocal, client: localClient }
  }

  const persisted = result.data
  const clientsWithPersisted = afterLocal.map((c) =>
    c.id === localClient.id ? persisted : c
  )

  return { clients: clientsWithPersisted, client: persisted }
}
