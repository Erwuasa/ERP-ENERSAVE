import { useMemo } from "react"
import { CalendarClock } from "lucide-react"
import { isRenovacionProxima } from "../lib/contract-renewal"

interface RenovacionContractRow {
  id: string
  comercialId: string
  compania: string
  clientName: string
  createdAt?: string
  tipoCliente?: string
  nif?: string
  diasRenovacion?: number
  estadoRenovacion?: string
  fechaRenovacion?: string
}

interface ComercialRenovacionesCardProps {
  contracts: RenovacionContractRow[]
  activeUserId: string
  onNavigate: () => void
}

export function ComercialRenovacionesCard({
  contracts,
  activeUserId,
  onNavigate,
}: ComercialRenovacionesCardProps) {
  const upcoming = useMemo(
    () =>
      contracts
        .filter((c) => c.comercialId === activeUserId && isRenovacionProxima(c))
        .sort((a, b) => (a.diasRenovacion ?? 999) - (b.diasRenovacion ?? 999)),
    [contracts, activeUserId]
  )

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="bg-brand-panel p-3 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-2 font-sans cursor-pointer hover:border-violet-500/40 transition-colors duration-200 group text-left w-full min-h-[132px]"
    >
      <div className="flex items-center gap-1.5">
        <CalendarClock className="h-3 w-3 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
        <span className="text-[10px] font-semibold text-brand-text uppercase tracking-tight group-hover:text-violet-500 transition-colors leading-tight">
          Renovaciones próximas
        </span>
      </div>

      <div className="pt-1 border-t border-dashed border-brand-border space-y-1 flex-1">
        <strong className="text-xl font-black text-violet-600 dark:text-violet-400 tabular-nums font-mono block leading-none">
          {upcoming.length}
        </strong>
        {upcoming.length > 0 ? (
          <ul className="space-y-0.5">
            {upcoming.slice(0, 2).map((c) => (
              <li
                key={c.id}
                className="text-[9px] font-mono text-brand-subtext truncate"
              >
                <span className="text-brand-text">{c.compania}</span>
                {" · "}
                {c.diasRenovacion ?? "—"}d
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[9px] font-mono text-brand-subtext">Sin renovaciones en 90 días</p>
        )}
        <span className="text-[9px] text-brand-subtext block">Ver en contratos →</span>
      </div>
    </button>
  )
}
