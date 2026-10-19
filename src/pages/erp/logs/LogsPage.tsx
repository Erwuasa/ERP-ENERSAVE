import { ScrollText } from "lucide-react"
import { useState } from "react"
import { LogsInboundPanel } from "./LogsInboundPanel"
import { LogsOutboundPanel } from "./LogsOutboundPanel"
import { LogsReconciliationPanel } from "./LogsReconciliationPanel"

type LogsTab = "entrantes" | "salientes" | "reconciliacion"

const TABS: { id: LogsTab; label: string }[] = [
  { id: "entrantes", label: "Entrantes" },
  { id: "salientes", label: "Salientes" },
  { id: "reconciliacion", label: "Reconciliación" },
]

export function LogsPage() {
  const [tab, setTab] = useState<LogsTab>("entrantes")

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-6 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <ScrollText className="w-6 h-6" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">Logs Enertech</h3>
              <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
                Webhooks entrantes, altas salientes y contratos huérfanos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-xl px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer ${
                  tab === item.id
                    ? "bg-cyan-600 text-white"
                    : "border border-brand-border bg-brand-surface text-brand-subtext hover:text-brand-text"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {tab === "entrantes" ? <LogsInboundPanel /> : null}
        {tab === "salientes" ? <LogsOutboundPanel /> : null}
        {tab === "reconciliacion" ? <LogsReconciliationPanel /> : null}
      </div>
    </div>
  )
}
