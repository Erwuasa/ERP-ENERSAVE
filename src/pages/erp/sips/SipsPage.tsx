import { ScanSearch } from "lucide-react"
import { SipsHistoryList } from "./components/SipsHistoryList"
import { SipsResultPanel } from "./components/SipsResultPanel"
import { SipsSearchForm } from "./components/SipsSearchForm"
import { SipsStatusNotice } from "./components/SipsStatusNotice"
import { useSipsLookup } from "./hooks/useSipsLookup"

const PANEL =
  "bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]"

export function SipsPage() {
  const lookup = useSipsLookup()
  const busy = lookup.state.phase === "loading" || lookup.state.phase === "waiting"
  const listo =
    lookup.state.phase === "done" && lookup.state.outcome.status === "listo" ? lookup.state.outcome : null

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className={`${PANEL} space-y-6 min-w-0`}>
        <div className="flex items-center space-x-3 border-b border-brand-border pb-5">
          <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
            <ScanSearch className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">SIPS</h3>
            <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
              Datos de un punto de suministro por CUPS. Cada consulta nueva gasta cuota del proveedor.
            </p>
          </div>
        </div>

        <SipsSearchForm
          cups={lookup.cups}
          producto={lookup.producto}
          busy={busy}
          inputError={lookup.inputError}
          onCupsChange={lookup.updateCups}
          onProductoChange={lookup.setProducto}
          onSubmit={() => lookup.submit()}
          onCancel={lookup.cancel}
        />

        <SipsStatusNotice state={lookup.state} />

        {listo ? <SipsResultPanel outcome={listo} onRefresh={() => lookup.submit({ force: true })} /> : null}
      </div>

      <aside className={`${PANEL} h-fit`}>
        <SipsHistoryList entries={lookup.history} onPick={lookup.pickFromHistory} />
      </aside>
    </div>
  )
}
