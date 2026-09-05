import { useEffect, useState } from "react"
import type { Contract } from "@/types/contract"
import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import {
  getMarcoRowById,
  listMarcoRetributivo,
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
  return (
    localRows.find(
      (r) =>
        r.compania === contract.compania &&
        r.tarifa === contract.tarifa &&
        r.tipo === contract.tipo
    ) ?? null
  )
}

export function useContratoMarcoRow(contract: Contract): UseContratoMarcoRowResult {
  const [row, setRow] = useState<MarcoRetributivoRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setIsLoading(true)

      if (contract.marcoEntryId) {
        const byId = await getMarcoRowById(contract.marcoEntryId)
        if (cancelled) return
        if (byId.ok) {
          setRow(byId.data)
          setIsLoading(false)
          return
        }
      }

      const listed = await listMarcoRetributivo()
      if (cancelled) return
      if (!listed.ok) {
        setRow(null)
        setIsLoading(false)
        return
      }

      setRow(resolveMarcoRow(contract, listed.data))
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [contract.marcoEntryId, contract.compania, contract.tarifa, contract.tipo])

  return {
    row,
    entry: row ? marcoRowToCatalogEntry(row) : null,
    isLoading,
  }
}
