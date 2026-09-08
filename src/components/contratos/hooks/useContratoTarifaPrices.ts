import { useEffect, useState } from "react"
import type { Contract } from "@/types/contract"
import { getCatalogPricesForContract } from "@/lib/supabase/tariffs"

export function useContratoTarifaPrices(contract?: Contract | null) {
  const [prices, setPrices] = useState(contract?.atPrices)

  useEffect(() => {
    if (contract?.atPrices && contract.atPrices.length > 0) {
      setPrices(contract.atPrices)
      return
    }
    if (!contract) {
      setPrices(undefined)
      return
    }

    let cancelled = false
    void getCatalogPricesForContract({
      atRateId: contract.atRateId,
      rateName: contract.atRateName || contract.tarifa,
      peaje: contract.atAccessTariff || contract.atr,
    }).then((rows) => {
      if (!cancelled && rows.length > 0) setPrices(rows)
    })
    return () => {
      cancelled = true
    }
  }, [
    contract,
    contract?.atAccessTariff,
    contract?.atPrices,
    contract?.atRateId,
    contract?.atRateName,
    contract?.atr,
    contract?.tarifa,
  ])

  return prices
}
