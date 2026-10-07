import { useCallback, useEffect, useRef, useState } from "react"
import { CUPS_ERROR_MESSAGES, validateCups } from "@/lib/sips/cups"
import { nextSipsPollDelaySeconds } from "@/lib/sips/polling"
import type { SipsOutcome, SipsProducto } from "@/lib/sips/types"
import { lookupSips } from "@/lib/supabase/sips"
import type { SipsQueryResult } from "@/lib/sips-query"
import { lookupSipsMock, SIPS_USE_MOCK_DATA } from "@/lib/sips/mock-lookup"

export type SipsLookupState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "waiting"; secondsLeft: number; attempt: number }
  | {
      phase: "done"
      outcome: Exclude<SipsOutcome, { status: "procesando" }>
      demoCharts?: SipsQueryResult
    }

const EXHAUSTED_MESSAGE =
  "El proveedor sigue procesando este CUPS. Vuelve a consultarlo en unos minutos."

export function useSipsLookup() {
  const [cups, setCups] = useState("")
  const [producto, setProducto] = useState<SipsProducto>("luz")
  const [state, setState] = useState<SipsLookupState>({ phase: "idle" })
  const [inputError, setInputError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runIdRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      runIdRef.current += 1
      clearTimer()
    }
  }, [clearTimer])

  const run = useCallback(
    async (normalizedCups: string, attempt: number, force: boolean, runId: number) => {
      setState({ phase: "loading" })

      if (SIPS_USE_MOCK_DATA) {
        try {
          const { outcome, demoCharts } = await lookupSipsMock(normalizedCups, producto)
          if (runId !== runIdRef.current) return
          setState({ phase: "done", outcome, demoCharts })
        } catch (err) {
          if (runId !== runIdRef.current) return
          const message =
            err instanceof Error ? err.message : "No se pudo generar la consulta de prueba."
          setState({
            phase: "done",
            outcome: { status: "error", code: "INVALID_CUPS", message },
          })
        }
        return
      }

      const outcome = await lookupSips(normalizedCups, producto, { force })
      if (runId !== runIdRef.current) return

      if (outcome.status !== "procesando") {
        setState({ phase: "done", outcome })
        return
      }

      const delay = nextSipsPollDelaySeconds(attempt, outcome.reintentarEnSegundos)
      if (delay === null) {
        setState({ phase: "done", outcome: { status: "error", code: "UPSTREAM", message: EXHAUSTED_MESSAGE } })
        return
      }

      let secondsLeft = delay
      setState({ phase: "waiting", secondsLeft, attempt })
      clearTimer()
      timerRef.current = setInterval(() => {
        secondsLeft -= 1
        if (secondsLeft > 0) {
          setState({ phase: "waiting", secondsLeft, attempt })
          return
        }
        clearTimer()
        void run(normalizedCups, attempt + 1, force, runId)
      }, 1000)
    },
    [producto, clearTimer]
  )

  const submit = useCallback(
    (options: { force?: boolean } = {}) => {
      const validation = validateCups(cups)
      if (validation.ok === false) {
        setInputError(CUPS_ERROR_MESSAGES[validation.reason])
        return
      }
      setInputError(null)
      clearTimer()
      runIdRef.current += 1
      void run(validation.cups, 1, options.force === true, runIdRef.current)
    },
    [cups, run, clearTimer]
  )

  const cancel = useCallback(() => {
    runIdRef.current += 1
    clearTimer()
    setState({ phase: "idle" })
  }, [clearTimer])

  const updateCups = useCallback((value: string) => {
    setCups(value.toUpperCase())
    setInputError(null)
  }, [])

  return {
    cups,
    producto,
    state,
    inputError,
    setProducto,
    updateCups,
    submit,
    cancel,
  }
}
