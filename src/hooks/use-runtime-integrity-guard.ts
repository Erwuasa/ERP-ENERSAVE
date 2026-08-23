import { useEffect, useRef, useState } from "react"
import {
  isRuntimeIntegrityEnforced,
  filterBlockingFindings,
} from "../lib/runtime-integrity-env"
import {
  mergeIntegrityResults,
  startIntegrityMonitor,
  type IntegrityFinding,
  type IntegrityScanResult,
} from "../lib/runtime-integrity"

interface UseRuntimeIntegrityGuardOptions {
  enabled: boolean
  onBlocked: (findings: IntegrityFinding[]) => void
}

export function useRuntimeIntegrityGuard({
  enabled,
  onBlocked,
}: UseRuntimeIntegrityGuardOptions) {
  const [blocked, setBlocked] = useState(false)
  const [findings, setFindings] = useState<IntegrityFinding[]>([])
  const resultRef = useRef<IntegrityScanResult>({ findings: [], blocked: false })
  const reportedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !isRuntimeIntegrityEnforced()) return

    reportedRef.current = false

    const stop = startIntegrityMonitor({
      onResult: (incoming) => {
        const merged = mergeIntegrityResults(resultRef.current, incoming)
        resultRef.current = merged
        const blockingFindings = filterBlockingFindings(merged.findings)
        setFindings(blockingFindings)

        if (blockingFindings.length === 0) return

        setBlocked(true)

        if (!reportedRef.current) {
          reportedRef.current = true
          onBlocked(blockingFindings)
        }
      },
    })

    return stop
  }, [enabled, onBlocked])

  return { blocked, findings }
}
