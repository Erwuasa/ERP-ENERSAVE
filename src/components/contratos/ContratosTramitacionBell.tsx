import { useMemo, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { FloatingPanelPortal } from "../ui/FloatingPanelPortal"
import type { TramitacionComercialGroup } from "../../lib/contratos-tramitacion-notifications"
import { formatTramitacionNuevosSummary } from "../../lib/contratos-tramitacion-notifications"

interface ContratosTramitacionBellProps {
  badgeCount: number
  groups: TramitacionComercialGroup[]
  recentSummary: string | null
  onSelectComercial: (comercialId: string) => void
  onShowAllUnreviewed: () => void
}

export function ContratosTramitacionBell({
  badgeCount,
  groups,
  recentSummary,
  onSelectComercial,
  onShowAllUnreviewed,
}: ContratosTramitacionBellProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  const summary = useMemo(
    () => formatTramitacionNuevosSummary(groups),
    [groups]
  )

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-brand-border bg-brand-surface text-brand-subtext hover:text-brand-text hover:border-cyan-500/30 transition-colors cursor-pointer"
        aria-label={
          badgeCount > 0
            ? `${badgeCount} contratos nuevos sin revisar`
            : "Notificaciones de contratos nuevos"
        }
        title="Contratos nuevos sin revisar"
      >
        <Bell className="w-4 h-4" />
        {badgeCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-[18px] text-center tabular-nums">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </button>

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="right"
        maxWidth={380}
        className="w-[min(100vw-1rem,380px)] rounded-xl border border-brand-border bg-brand-panel shadow-xl p-3 space-y-3"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-subtext">
            Contratos sin revisar
          </p>
          {summary ? (
            <p className="text-sm font-semibold text-brand-text leading-snug">
              {summary}
            </p>
          ) : (
            <p className="text-sm text-brand-subtext">
              No hay contratos pendientes de revisión.
            </p>
          )}
          {recentSummary ? (
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 leading-snug">
              Recientes: {recentSummary}
            </p>
          ) : null}
        </div>

        {groups.length > 0 ? (
          <ul className="space-y-1 max-h-56 overflow-y-auto">
            {groups.map((group) => (
              <li key={group.comercialId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectComercial(group.comercialId)
                    setOpen(false)
                  }}
                  className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left text-sm text-brand-text hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors cursor-pointer"
                >
                  <span className="font-medium truncate">{group.comercialName}</span>
                  <span className="shrink-0 text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {group.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {badgeCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              onShowAllUnreviewed()
              setOpen(false)
            }}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Ver todos sin revisar
          </button>
        ) : null}
      </FloatingPanelPortal>
    </div>
  )
}
