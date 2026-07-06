import { CalendarClock } from "lucide-react"
import {
  addMonthsFromCadencia,
  type FidelizacionCadenciaMeses,
  type FidelizacionRow,
} from "../../lib/ventas/mi-dia-cockpit"
import { MiDiaCard } from "./MiDiaCard"
import { MI_DIA_SECTION_THEME } from "./mi-dia-theme"

interface MiDiaFidelizacionPanelProps {
  rows: FidelizacionRow[]
  onCadenciaChange: (id: string, months: FidelizacionCadenciaMeses) => void
}

const CADENCIA_OPTIONS: FidelizacionCadenciaMeses[] = [1, 2, 3]

export function MiDiaFidelizacionPanel({
  rows,
  onCadenciaChange,
}: MiDiaFidelizacionPanelProps) {
  const theme = MI_DIA_SECTION_THEME.fidelizacion

  return (
    <MiDiaCard
      icon={CalendarClock}
      title="Fidelización"
      badge={rows.length > 0 ? rows.length : undefined}
      iconClass={theme.iconClass}
      iconBgClass={theme.iconBgClass}
      borderClass={theme.borderClass}
      headerTooltip={theme.tooltip}
      noPadding
    >
      {rows.length === 0 ? (
        <p className="text-xs text-brand-subtext px-3 py-6 text-center">—</p>
      ) : (
        <ul className="divide-y divide-brand-border/30">
          {rows.map((row) => {
            const proximo = new Date(row.proximoContacto)
            const isDue = proximo.getTime() <= Date.now()
            return (
              <li
                key={row.id}
                className="px-3 py-2.5 flex items-center gap-2 min-h-[44px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brand-text truncate">
                    {row.cliente}
                  </p>
                  <p
                    className={`text-[10px] font-mono tabular-nums ${isDue ? "text-rose-600 dark:text-rose-400" : "text-brand-subtext"}`}
                    title="Próximo contacto"
                  >
                    {proximo.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <select
                  value={row.frecuenciaMeses}
                  onChange={(e) =>
                    onCadenciaChange(row.id, Number(e.target.value) as FidelizacionCadenciaMeses)
                  }
                  aria-label={`Cadencia ${row.cliente}`}
                  className="h-7 pl-1.5 pr-5 text-[10px] rounded-md border border-brand-border/60 bg-brand-bg text-brand-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {CADENCIA_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}m
                    </option>
                  ))}
                </select>
              </li>
            )
          })}
        </ul>
      )}
    </MiDiaCard>
  )
}

export function recalcProximoContacto(
  months: FidelizacionCadenciaMeses,
  from = new Date()
): string {
  return addMonthsFromCadencia(from, months).toISOString()
}
