import { useEffect, useState } from "react"
import type { Contract } from "@/types/contract"
import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import {
  listMarcoRetributivoForCampaigns,
  marcoRowToCatalogEntry,
  type MarcoRetributivoRow,
} from "@/lib/supabase/marco-retributivo"

interface UseContratoMarcoRowResult {
  row: MarcoRetributivoRow | null
  entry: MarcoRetributivoEntry | null
  isLoading: boolean
}

function resolveMarcoRow(
  contract: Contract,
  localRows: MarcoRetributivoRow[]
): MarcoRetributivoRow | null {
  if (contract.marcoEntryId) {
    const byId = localRows.find((r) => r.id === contract.marcoEntryId)
    if (byId) return byId
  }
  const atIds = [contract.atMarcoId, contract.atRateId].filter(Boolean)
  const byAt = localRows.find(
    (r) =>
      (r.at_marco_id && atIds.includes(r.at_marco_id)) ||
      (r.at_rate_id && atIds.includes(r.at_rate_id))
  )
  if (byAt) return byAt
  return (
    localRows.find(
      (r) =>
        r.compania === contract.compania &&
        r.tarifa === contract.tarifa &&
        r.tipo === contract.tipo
    ) ?? null
  )
}

export function useContratoMarcoRow(contract?: Contract | null): UseContratoMarcoRowResult {
  const [row, setRow] = useState<MarcoRetributivoRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!contract) {
        setRow(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      const listed = await listMarcoRetributivoForCampaigns(
        contract.tarifa.trim() ? [contract.tarifa] : []
      )
      if (cancelled) return
      if (!listed.ok) {
        setRow(null)
        setIsLoading(false)
        return
      }

      const rows = listed.data.map((row) =>
        row.compania.trim() ? row : { ...row, compania: contract.compania }
      )
      setRow(resolveMarcoRow(contract, rows))
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [contract?.id, contract?.marcoEntryId, contract?.atMarcoId, contract?.atRateId, contract?.compania, contract?.tarifa, contract?.tipo])

  return {
    row,
    entry: row ? marcoRowToCatalogEntry(row) : null,
    isLoading,
  }
}
