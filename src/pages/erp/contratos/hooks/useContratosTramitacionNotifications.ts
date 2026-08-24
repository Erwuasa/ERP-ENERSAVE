import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import { subscribeContratosEquipoInserts } from "@/lib/contratos-equipo-realtime"
import {
  countUnreviewedTramitacionContracts,
  formatTramitacionNuevosSummary,
  groupInsertBufferByComercial,
  groupUnreviewedTramitacionByComercial,
  loadReviewedTramitacionIds,
  pruneInsertBuffer,
  pushInsertBufferEvent,
  saveReviewedTramitacionIds,
  type TramitacionInsertEvent,
} from "@/lib/contratos-tramitacion-notifications"

export function useContratosTramitacionNotifications(enabled: boolean) {
  const { isLoggedIn } = useAuth()
  const { contracts, setContracts, setContractsListFilter, setContractsUserFilterId } =
    useErpData()
  const [reviewedContractIds, setReviewedContractIds] = useState(loadReviewedTramitacionIds)
  const [insertBuffer, setInsertBuffer] = useState<TramitacionInsertEvent[]>([])

  useEffect(() => {
    if (!enabled || !isLoggedIn) return

    const unsubscribe = subscribeContratosEquipoInserts(
      ({ contract, comercialId, comercialName }) => {
        setContracts((prev) => {
          if (prev.some((item) => item.id === contract.id)) return prev
          return [contract, ...prev]
        })
        setInsertBuffer((prev) =>
          pushInsertBufferEvent(prev, {
            contractId: contract.id,
            comercialId,
            comercialName,
            insertedAt: Date.now(),
          })
        )
      }
    )

    return () => {
      unsubscribe?.()
    }
  }, [enabled, isLoggedIn, setContracts])

  const tramitacionUnreviewedCount = useMemo(
    () => countUnreviewedTramitacionContracts(contracts, reviewedContractIds),
    [contracts, reviewedContractIds]
  )

  const tramitacionUnreviewedGroups = useMemo(
    () => groupUnreviewedTramitacionByComercial(contracts, reviewedContractIds),
    [contracts, reviewedContractIds]
  )

  const tramitacionRecentSummary = useMemo(
    () => formatTramitacionNuevosSummary(groupInsertBufferByComercial(pruneInsertBuffer(insertBuffer))),
    [insertBuffer]
  )

  const selectComercial = useCallback(
    (comercialId: string) => {
      setContractsListFilter("nuevos_sin_revisar")
      setContractsUserFilterId(comercialId)
    },
    [setContractsListFilter, setContractsUserFilterId]
  )

  const showAllUnreviewed = useCallback(() => {
    setContractsListFilter("nuevos_sin_revisar")
    setContractsUserFilterId("all")
  }, [setContractsListFilter, setContractsUserFilterId])

  const markReviewed = useCallback((contractId: string) => {
    setReviewedContractIds((prev) => {
      if (prev.has(contractId)) return prev
      const next = new Set(prev)
      next.add(contractId)
      saveReviewedTramitacionIds(next)
      return next
    })
  }, [])

  return {
    reviewedContractIds,
    tramitacionUnreviewedCount,
    tramitacionUnreviewedGroups,
    tramitacionRecentSummary,
    selectComercial,
    showAllUnreviewed,
    markReviewed,
  }
}
