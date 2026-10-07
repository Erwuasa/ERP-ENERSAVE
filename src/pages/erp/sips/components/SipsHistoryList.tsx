import type { SipsHistoryEntry } from "@/lib/supabase/sips"

const ESTADO_BADGE: Record<SipsHistoryEntry["estado"], { label: string; className: string }> = {
  listo: { label: "Con datos", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  procesando: { label: "En proceso", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  sin_datos: { label: "Sin datos", className: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
  error: { label: "Error", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
}

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

interface SipsHistoryListProps {
  entries: SipsHistoryEntry[]
  onPick: (entry: SipsHistoryEntry) => void
}

export function SipsHistoryList({ entries, onPick }: SipsHistoryListProps) {
  return (
    <section aria-label="Consultas recientes" className="space-y-3">
      <h3 className="text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">
        Consultas recientes
      </h3>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-brand-subtext border border-dashed border-brand-border rounded-2xl bg-slate-50/50 dark:bg-transparent">
          <p className="text-xs">Aún no has consultado ningún CUPS.</p>
        </div>
      ) : (
        <ul className="divide-y divide-brand-border">
          {entries.map((entry) => {
            const badge = ESTADO_BADGE[entry.estado]
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onPick(entry)}
                  className="w-full flex items-center justify-between gap-3 py-3 px-2 text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-bold text-brand-text truncate">{entry.cups}</span>
                    <span className="block text-[10px] font-mono text-brand-subtext mt-0.5">
                      {formatWhen(entry.createdAt)} · {entry.producto === "gas" ? "Gas" : "Luz"}
                      {entry.fromCache ? " · caché" : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
