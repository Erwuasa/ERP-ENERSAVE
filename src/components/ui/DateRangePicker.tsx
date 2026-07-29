import { useEffect, useRef, useState } from "react"
import { addMonths, endOfDay, format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DateRange } from "react-day-picker"
import "react-day-picker/style.css"
import {
  CUSTOM_PRESET_ID,
  DATE_RANGE_PRESETS,
  getPresetById,
} from "../../lib/date-range-presets"
import { formatDateRangeLabel, type DateRangePickerValue } from "../../lib/date-range"
import { EMPTY_DATE_RANGE, isDateRangeFilterActive } from "../../lib/date-range-active"
import { FloatingPanelPortal } from "./FloatingPanelPortal"
import { FilterTriggerButton } from "./FilterTriggerButton"

export type { DateRangePickerValue }

export interface DateRangePickerProps {
  value: DateRangePickerValue
  onChange: (value: DateRangePickerValue) => void
  align?: "left" | "right"
  className?: string
  onOpenChange?: (open: boolean) => void
  /** Valor por defecto de la pantalla; la X restaura este estado */
  defaultValue?: DateRangePickerValue
  triggerLabel?: string
}

export function DateRangePicker({
  value,
  onChange,
  align = "left",
  className = "",
  onOpenChange,
  defaultValue = EMPTY_DATE_RANGE,
  triggerLabel = "Rango de fechas",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [draftPresetId, setDraftPresetId] = useState<string | undefined>(value.presetId)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    value.from && value.to ? { from: value.from, to: value.to } : undefined
  )
  const [displayMonth, setDisplayMonth] = useState<Date>(value.from ?? new Date())

  function setOpenState(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!open) return
    setDraftPresetId(value.presetId)
    setDraftRange(value.from && value.to ? { from: value.from, to: value.to } : undefined)
    setDisplayMonth(value.from ?? new Date())
  }, [open, value])

  function selectPreset(id: string) {
    setDraftPresetId(id)
    if (id === CUSTOM_PRESET_ID) return
    const preset = getPresetById(id)
    if (!preset) return
    const { from, to } = preset.getRange()
    setDraftRange({ from, to })
    setDisplayMonth(from)
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    setDraftRange(range)
    setDraftPresetId(CUSTOM_PRESET_ID)
  }

  const canApply = Boolean(draftRange?.from && draftRange?.to)

  function handleApply() {
    if (!draftRange?.from || !draftRange?.to) return
    onChange({
      from: startOfDay(draftRange.from),
      to: endOfDay(draftRange.to),
      presetId: draftPresetId,
    })
    setOpenState(false)
  }

  function handleCancel() {
    setOpenState(false)
  }

  function handleClear() {
    onChange({ ...defaultValue })
    setOpenState(false)
  }

  const isActive = isDateRangeFilterActive(value, defaultValue)
  const valueLabel = isActive ? formatDateRangeLabel(value) : undefined

  const panelClass =
    "w-[min(100vw-1rem,640px)] bg-brand-panel border border-brand-border rounded-xl shadow-2xl overflow-hidden"

  return (
    <div ref={anchorRef} className={`relative shrink-0 ${className}`}>
      <FilterTriggerButton
        label={triggerLabel}
        valueLabel={valueLabel}
        isActive={isActive}
        open={open}
        onToggle={() => setOpenState(!open)}
        onClear={handleClear}
        icon={<CalendarDays className="w-4 h-4 text-brand-subtext shrink-0" />}
        minWidthClass="min-w-[180px]"
      />

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpenState(false)}
        anchorRef={anchorRef}
        align={align}
        maxWidth={640}
        className={panelClass}
      >
        <div className="flex flex-col sm:flex-row min-h-[280px] sm:min-h-[320px]">
          <aside className="sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-brand-border p-2 space-y-0.5 bg-brand-bg/30">
            {DATE_RANGE_PRESETS.map((preset) => {
              const isActive = draftPresetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-brand-text hover:bg-brand-surface/80"
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </aside>

          <div className="flex-1 p-3 min-w-0 overflow-x-auto">
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => setDisplayMonth((m) => addMonths(m, -1))}
                className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:border-cyan-500/40 cursor-pointer"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono font-bold text-brand-subtext uppercase">
                {format(displayMonth, "MMMM yyyy", { locale: es })} —{" "}
                {format(addMonths(displayMonth, 1), "MMMM yyyy", { locale: es })}
              </span>
              <button
                type="button"
                onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
                className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:border-cyan-500/40 cursor-pointer"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <DayPicker
              mode="range"
              locale={es}
              weekStartsOn={1}
              numberOfMonths={2}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              selected={draftRange}
              onSelect={handleCalendarSelect}
              showOutsideDays
              classNames={{
                root: "date-range-picker-root mx-auto",
                months: "date-range-picker-months flex flex-col sm:flex-row gap-4",
                month: "space-y-2",
                month_caption: "hidden",
                nav: "hidden",
                weekday: "text-[10px] font-mono text-brand-subtext font-normal w-8",
                day: "text-xs font-mono",
                day_button:
                  "h-8 w-8 rounded-full hover:bg-cyan-500/15 transition-colors cursor-pointer",
                selected: "bg-cyan-600 text-white hover:bg-cyan-600 rounded-full",
                range_start: "bg-cyan-600 text-white rounded-l-full rounded-r-none",
                range_end: "bg-cyan-600 text-white rounded-r-full rounded-l-none",
                range_middle: "bg-cyan-500/20 text-brand-text rounded-none",
                today:
                  "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-emerald-500 font-bold",
                outside: "text-brand-subtext/40",
                disabled: "text-brand-subtext/30",
              }}
            />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-brand-border bg-brand-bg/40">
          <p className="text-[10px] font-mono text-brand-subtext">
            Selecciona un rango o un preset
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs font-bold text-brand-subtext hover:text-brand-text cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canApply}
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-400 disabled:hover:bg-slate-400"
            >
              Aplicar
            </button>
          </div>
        </footer>
      </FloatingPanelPortal>
    </div>
  )
}
