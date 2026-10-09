import { ScanSearch } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { mapSipsListoToVisual, mapSipsQueryResultToVisual } from "@/lib/sips/to-visual"
import { SipsLoadingAnimation } from "./components/SipsLoadingAnimation"
import { SipsResultsPanel } from "./components/SipsResultsPanel"
import { SipsSearchForm } from "./components/SipsSearchForm"
import { SipsStatusNotice } from "./components/SipsStatusNotice"
import { useSipsLookup } from "./hooks/useSipsLookup"

const PANEL =
  "bg-brand-panel p-4 sm:p-6 rounded-3xl border border-brand-border shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]"

export function SipsPage() {
  const lookup = useSipsLookup()
  const busy = lookup.state.phase === "loading" || lookup.state.phase === "waiting"
  const doneState = lookup.state.phase === "done" ? lookup.state : null
  const listo = doneState?.outcome.status === "listo" ? doneState.outcome : null
  const visual = listo
    ? doneState?.demoCharts
      ? mapSipsQueryResultToVisual(doneState.demoCharts)
      : mapSipsListoToVisual(listo)
    : null
  const showStatusNotice =
    lookup.state.phase === "waiting" ||
    (lookup.state.phase === "done" &&
      (lookup.state.outcome.status === "error" || lookup.state.outcome.status === "sin_datos"))

  return (
    <div className="animate-fade-in text-slate-800 dark:text-slate-100 font-sans max-w-[1600px]">
      <div className={`${PANEL} space-y-4 min-w-0`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-brand-border pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 shrink-0">
              <ScanSearch className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">Consulta SIPS</h3>
              <p className="text-[10px] font-mono text-brand-subtext mt-0.5 truncate">
                Punto de suministro por CUPS
              </p>
            </div>
          </div>
          <div className="w-full lg:max-w-3xl shrink-0">
            <SipsSearchForm
              cups={lookup.cups}
              producto={lookup.producto}
              busy={busy}
              inputError={lookup.inputError}
              onCupsChange={lookup.updateCups}
              onProductoChange={lookup.setProducto}
              onSubmit={() => lookup.submit()}
              onCancel={lookup.cancel}
              compact
            />
          </div>
        </div>

        {lookup.state.phase === "loading" ? (
          <SipsLoadingAnimation />
        ) : showStatusNotice ? (
          <SipsStatusNotice state={lookup.state} />
        ) : null}

        <AnimatePresence mode="wait">
          {visual ? (
            <motion.div
              key={visual.cups}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <SipsResultsPanel
                data={visual}
                onClose={lookup.cancel}
                onRefresh={() => lookup.submit({ force: true })}
              />
            </motion.div>
          ) : lookup.state.phase === "idle" ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-dashed border-brand-border bg-brand-surface/40 px-4 py-12 text-center"
            >
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
                Introduce un CUPS y pulsa consultar
              </p>
              <p className="text-[10px] font-mono text-brand-subtext/80 mt-1 max-w-md mx-auto">
                Verás el suministro, el consumo anual y la potencia contratada por periodo.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
