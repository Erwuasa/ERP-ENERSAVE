import { useCallback, useRef, type Dispatch, type SetStateAction } from "react"
import type { ComparadorPeriodValues } from "@/lib/erp/comparador-rates"

type PotenciaPeriod = keyof ComparadorPeriodValues
type ReplicablePeriod = Exclude<PotenciaPeriod, "p1">

const REPLICABLE_PERIODS: ReplicablePeriod[] = ["p2", "p3", "p4", "p5", "p6"]

export function applyPotenciaP1Replication(
  prev: ComparadorPeriodValues,
  p1Value: number,
  touchedManually: ReadonlySet<ReplicablePeriod>
): ComparadorPeriodValues {
  const next = { ...prev, p1: p1Value }
  for (const period of REPLICABLE_PERIODS) {
    if (!touchedManually.has(period)) {
      next[period] = p1Value
    }
  }
  return next
}

export function usePotenciaP1Autofill(
  setCompPotencias: Dispatch<SetStateAction<ComparadorPeriodValues>>
) {
  const touchedManuallyRef = useRef(new Set<ReplicablePeriod>())

  const handlePotenciaP1Change = useCallback(
    (value: number) => {
      setCompPotencias((prev) =>
        applyPotenciaP1Replication(prev, value, touchedManuallyRef.current)
      )
    },
    [setCompPotencias]
  )

  const handlePotenciaManualChange = useCallback(
    (period: ReplicablePeriod, value: number) => {
      touchedManuallyRef.current.add(period)
      setCompPotencias((prev) => ({ ...prev, [period]: value }))
    },
    [setCompPotencias]
  )

  return {
    handlePotenciaP1Change,
    handlePotenciaManualChange,
  }
}
