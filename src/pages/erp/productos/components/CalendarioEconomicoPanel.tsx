import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Info, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import {
  CALENDARIO_ECONOMICO_MONTHS,
  CALENDARIO_ECONOMICO_PERIODS,
  countActivePeriodsForMonth,
  DEFAULT_CALENDARIO_ECONOMICO,
  getCurrentCalendarioMonthId,
  isCalendarioEconomicoValid,
  isCurrentCalendarioMonth,
  loadCalendarioEconomicoConfig,
  saveCalendarioEconomicoConfig,
  toggleCalendarioPeriod,
  type CalendarioEconomicoConfig,
  type CalendarioEconomicoMonthId,
  type CalendarioEconomicoPeriodId,
} from "@/lib/calendario-economico"

interface CalendarioEconomicoPanelProps {
  canEdit: boolean
  onBack: () => void
}

function periodLabel(periodId: CalendarioEconomicoPeriodId): string {
  return periodId.toUpperCase()
}

function currentMonthHeaderClass(isCurrent: boolean): string {
  if (!isCurrent) {
    return "px-2 py-2 text-center text-[10px] font-mono uppercase text-brand-subtext border-b border-brand-border min-w-[3rem]"
  }
  return "px-2 py-2 text-center text-[10px] font-mono uppercase text-cyan-800 dark:text-cyan-200 border-b-2 border-cyan-500/50 min-w-[3rem] bg-cyan-500/15"
}

function currentMonthCellClass(isCurrent: boolean): string {
  return isCurrent ? "px-2 py-2 text-center bg-cyan-500/[0.07] dark:bg-cyan-500/10" : "px-2 py-2 text-center"
}

export function CalendarioEconomicoPanel({ canEdit, onBack }: CalendarioEconomicoPanelProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CalendarioEconomicoConfig>(DEFAULT_CALENDARIO_ECONOMICO)
  const [saved, setSaved] = useState<CalendarioEconomicoConfig>(DEFAULT_CALENDARIO_ECONOMICO)
  const [currentMonthId, setCurrentMonthId] = useState<CalendarioEconomicoMonthId>(() =>
    getCurrentCalendarioMonthId()
  )

  useEffect(() => {
    const loaded = loadCalendarioEconomicoConfig()
    setDraft(loaded)
    setSaved(loaded)
  }, [])

  useEffect(() => {
    function syncCurrentMonth() {
      setCurrentMonthId(getCurrentCalendarioMonthId())
    }

    syncCurrentMonth()
    const timer = window.setInterval(syncCurrentMonth, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const config = editing ? draft : saved
  const isValid = useMemo(() => isCalendarioEconomicoValid(config), [config])

  function handleToggle(monthId: CalendarioEconomicoMonthId, periodId: CalendarioEconomicoPeriodId) {
    if (!editing) return
    setDraft((prev) => toggleCalendarioPeriod(prev, monthId, periodId))
  }

  function handleSave() {
    if (!isCalendarioEconomicoValid(draft)) {
      toast.error("Cada mes debe tener exactamente 3 periodos activos.")
      return
    }
    saveCalendarioEconomicoConfig(draft)
    setSaved(draft)
    setEditing(false)
    toast.success("Calendario económico guardado.")
  }

  function handleCancelEdit() {
    setDraft(saved)
    setEditing(false)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h2 className="text-sm font-black uppercase font-mono tracking-wider text-brand-text">
              Calendario económico
            </h2>
            <p className="text-[10px] font-mono text-brand-subtext">
              Configuración de periodos por mes para tarifas 3.0TD y 6.xTD
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 rounded-lg border border-brand-border bg-brand-panel text-[10px] font-mono font-bold uppercase text-brand-subtext hover:text-brand-text cursor-pointer"
          >
            Volver a tarifas
          </button>
          {canEdit ? (
            editing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-2 rounded-lg border border-brand-border bg-brand-panel text-[10px] font-mono font-bold uppercase text-brand-subtext hover:text-brand-text cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isValid}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                >
                  Guardar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono font-bold uppercase hover:bg-cyan-500/15 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                Habilitar edición
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-border bg-brand-panel p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-brand-text">Configuración de periodos por mes</h3>
          <p className="text-xs text-brand-subtext mt-1">
            Para tarifas 3.0TD y 6.xTD, cada mes debe tener exactamente 3 periodos activos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-brand-subtext">
          {editing ? (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Unlock className="w-3.5 h-3.5" />
              Modo edición activo
            </span>
          ) : canEdit ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Lock className="w-3.5 h-3.5" />
              Modo lectura. Pulsa «Habilitar edición» para cambiar.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-brand-subtext">
              <Lock className="w-3.5 h-3.5" />
              Solo lectura. La edición está reservada al superadmin.
            </span>
          )}
          <span className="inline-flex items-center gap-1 ml-auto text-cyan-700 dark:text-cyan-300">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cyan-500/25 border border-cyan-500/40" />
            Mes actual
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-brand-panel px-2 py-2 text-left text-[10px] font-mono uppercase text-brand-subtext border-b border-brand-border">
                  Periodo
                </th>
                {CALENDARIO_ECONOMICO_MONTHS.map((month) => {
                  const isCurrent = month.id === currentMonthId
                  return (
                    <th key={month.id} className={currentMonthHeaderClass(isCurrent)}>
                      <span className="block">{month.label}</span>
                      {isCurrent ? (
                        <span className="mt-0.5 inline-flex px-1 py-0.5 rounded text-[8px] font-bold uppercase bg-cyan-500/20 text-cyan-800 dark:text-cyan-200">
                          Actual
                        </span>
                      ) : null}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {CALENDARIO_ECONOMICO_PERIODS.map((periodId) => (
                <tr key={periodId} className="border-b border-brand-border/60">
                  <td className="sticky left-0 z-10 bg-brand-panel px-2 py-2 font-mono font-bold text-brand-text whitespace-nowrap">
                    {periodLabel(periodId)}
                  </td>
                  {CALENDARIO_ECONOMICO_MONTHS.map((month) => {
                    const active = config[month.id]?.includes(periodId) ?? false
                    const isCurrent = isCurrentCalendarioMonth(month.id)
                    return (
                      <td key={month.id} className={currentMonthCellClass(isCurrent)}>
                        <button
                          type="button"
                          disabled={!editing}
                          onClick={() => handleToggle(month.id, periodId)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                            active
                              ? isCurrent
                                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-800 dark:text-cyan-200"
                                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : isCurrent
                                ? "border-cyan-500/20 bg-brand-surface/80 text-brand-subtext"
                                : "border-brand-border bg-brand-surface text-brand-subtext"
                          } ${editing ? "cursor-pointer hover:border-cyan-500/40" : "cursor-default opacity-80"}`}
                          aria-label={`${month.label} ${periodLabel(periodId)} ${active ? "activo" : "inactivo"}`}
                        >
                          {active ? "✓" : ""}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="bg-brand-surface/50">
                <td className="sticky left-0 z-10 bg-brand-surface/50 px-2 py-2 font-mono font-bold text-brand-subtext">
                  Total
                </td>
                {CALENDARIO_ECONOMICO_MONTHS.map((month) => {
                  const count = countActivePeriodsForMonth(config, month.id)
                  const ok = count === 3
                  const isCurrent = month.id === currentMonthId
                  return (
                    <td key={month.id} className={currentMonthCellClass(isCurrent)}>
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tabular-nums ${
                          ok
                            ? isCurrent
                              ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {count}/3
                      </span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-sky-700 dark:text-sky-300">
            <Info className="w-3.5 h-3.5" />
            Información importante
          </p>
          <ul className="text-[11px] text-brand-subtext space-y-1 list-disc pl-4">
            <li>Cada mes debe tener exactamente 3 periodos activos</li>
            <li>Esta configuración afecta a todas las tarifas 3.0TD y 6.xTD</li>
            <li>Los cambios se aplican en las comparativas</li>
            <li>Los periodos activos determinan qué precios de consumo se usan</li>
            <li>La columna resaltada en cyan indica el mes en curso y se actualiza automáticamente</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
