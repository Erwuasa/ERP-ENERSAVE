import { ChevronLeft, ChevronRight } from "lucide-react"

export function formatLogTime(iso: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function LogsPager(props: {
  page: number
  loading: boolean
  hasMore: boolean
  onPage: (page: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={props.loading || props.page <= 1}
        onClick={() => props.onPage(props.page - 1)}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-[10px] font-extrabold uppercase tracking-wider text-brand-subtext hover:text-brand-text disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Anterior
      </button>
      <span className="text-[10px] font-mono font-bold text-brand-subtext tabular-nums">Pág. {props.page}</span>
      <button
        type="button"
        disabled={props.loading || !props.hasMore}
        onClick={() => props.onPage(props.page + 1)}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-[10px] font-extrabold uppercase tracking-wider text-brand-subtext hover:text-brand-text disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
      >
        Siguiente
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function LogsStatus(props: { loading: boolean; errorMessage: string | null; empty: string; loadingLabel: string }) {
  if (props.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-brand-subtext">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{props.loadingLabel}</span>
      </div>
    )
  }
  if (props.errorMessage) {
    return (
      <div className="p-8 text-center border border-dashed border-red-500/40 rounded-2xl bg-red-500/5">
        <p className="text-xs text-red-600 dark:text-red-400">{props.errorMessage}</p>
      </div>
    )
  }
  return (
    <div className="p-12 text-center text-brand-subtext border border-dashed border-brand-border rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
      <p className="text-xs">{props.empty}</p>
    </div>
  )
}

export function toneClass(tone: "ok" | "problem" | "pending"): string {
  if (tone === "ok") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
  if (tone === "problem") return "bg-red-500/15 text-red-700 dark:text-red-400"
  return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
}
