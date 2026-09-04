import { getSupabaseClient, isSupabaseConfigured } from "./supabase/client"
import { getCachedProviderByAtCompanyId, mapRowToContract } from "./supabase/contracts"
import type { Contract } from "../types/contract"
import type { Row } from "./supabase/result"

export interface ContratosEquipoInsertPayload {
  contract: Contract
  comercialId: string
  comercialName: string
}

export function subscribeContratosEquipoInserts(
  onInsert: (payload: ContratosEquipoInsertPayload) => void
): (() => void) | null {
  if (!isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const channel = supabase
    .channel("contratos-nuevos")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "contratos_equipo" },
      (payload) => {
        const row = payload.new as Row | null
        if (!row?.id) return

        const contract = mapRowToContract(row, getCachedProviderByAtCompanyId())
        onInsert({
          contract,
          comercialId: contract.comercialId,
          comercialName: contract.comercialName || "Comercial sin nombre",
        })
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
