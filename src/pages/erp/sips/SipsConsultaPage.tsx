import { useCallback, useState, type FormEvent } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
import {
  fetchSipsByCups,
  normalizeSipsCupsInput,
  SIPS_CUPS_PLACEHOLDER,
  type SipsQueryResult,
} from "@/lib/sips-query"
import { SipsLoadingAnimation } from "@/pages/erp/sips/components/SipsLoadingAnimation"
import { mapSipsQueryResultToVisual } from "@/lib/sips/to-visual"
import { SipsResultsPanel } from "@/pages/erp/sips/components/SipsResultsPanel"
import { ENERSAVE_ACTION } from "@/lib/enersave-ui-theme"

type QueryPhase = "idle" | "loading" | "success" | "error"

export function SipsConsultaPage() {
  const [cupsInput, setCupsInput] = useState("")
  const [phase, setPhase] = useState<QueryPhase>("idle")
  const [result, setResult] = useState<SipsQueryResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const runQuery = useCallback(async (raw: string) => {
    const normalized = normalizeSipsCupsInput(raw)
    if (!normalized.trim()) {
      toast.error("Introduce un CUPS para consultar.")
      return
    }

    setPhase("loading")
    setErrorMessage(null)
    setResult(null)

    try {
      const data = await fetchSipsByCups(normalized)
      setResult(data)
      setPhase("success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar la consulta SIPS."
      setErrorMessage(message)
      setPhase("error")
      toast.error(message)
    }
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void runQuery(cupsInput)
  }

  function handleCloseResults() {
    setResult(null)
    setPhase("idle")
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto pl-3 sm:pl-4 py-1">
      <header className="shrink-0 space-y-1">
        <h1 className="text-sm font-extrabold uppercase tracking-wide text-brand-text">
          Consulta SIPS
        </h1>
        <p className="text-[11px] text-brand-subtext max-w-xl leading-relaxed">
          Consulta datos de suministro del Sistema de Información de Puntos de Suministro por CUPS.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 flex flex-col sm:flex-row gap-2 sm:items-stretch max-w-3xl"
      >
        <label className="sr-only" htmlFor="sips-cups-input">
          CUPS
        </label>
        <input
          id="sips-cups-input"
          type="text"
          value={cupsInput}
          onChange={(e) => setCupsInput(e.target.value.toUpperCase())}
          placeholder={SIPS_CUPS_PLACEHOLDER}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 min-w-0 h-11 px-4 rounded-xl border border-brand-border bg-brand-panel font-mono text-sm text-brand-text placeholder:text-brand-subtext/45 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-shadow"
        />
        <button
          type="submit"
          disabled={phase === "loading"}
          className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-xs font-extrabold uppercase tracking-wide cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${ENERSAVE_ACTION.primary}`}
        >
          <Search className="w-4 h-4" aria-hidden />
          Consultar
        </button>
      </form>

      <AnimatePresence mode="wait">
        {phase === "loading" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-brand-border bg-brand-panel"
          >
            <SipsLoadingAnimation />
          </motion.div>
        ) : null}

        {phase === "error" && errorMessage ? (
          <motion.p
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-mono text-rose-600 dark:text-rose-400"
          >
            {errorMessage}
          </motion.p>
        ) : null}

        {phase === "success" && result ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SipsResultsPanel data={mapSipsQueryResultToVisual(result)} onClose={handleCloseResults} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
