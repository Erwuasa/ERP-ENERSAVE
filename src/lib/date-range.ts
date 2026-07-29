import { addMonths as dfAddMonths, format } from "date-fns"
import { es } from "date-fns/locale"
import { getDefaultDateRangePickerValue, getPresetById } from "./date-range-presets"

export interface DateRangePickerValue {
  from: Date | null
  to: Date | null
  presetId?: string
}

export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

export function isoDateToDate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number)
  return new Date(y, m - 1, day)
}

export function defaultDateRange(reference = new Date()): DateRangePickerValue {
  return getDefaultDateRangePickerValue(reference)
}

export function formatDateRangeLabel(value: DateRangePickerValue): string {
  if (value.presetId && value.presetId !== "personalizado") {
    const preset = getPresetById(value.presetId)
    if (preset) return preset.label
  }
  if (value.from && value.to) {
    return `${format(value.from, "dd/MM/yyyy", { locale: es })} — ${format(value.to, "dd/MM/yyyy", { locale: es })}`
  }
  return "Rango de fechas"
}

export function isDateInRange(dateStr: string, from: string, to: string): boolean {
  const d = dateStr.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export function dateRangeToIsoStrings(value: DateRangePickerValue): {
  from: string
  to: string
} | null {
  if (!value.from || !value.to) return null
  return { from: toIsoDate(value.from), to: toIsoDate(value.to) }
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function getMonthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number)
  return { year: y, month: m - 1 }
}

export function addMonths(d: Date, months: number): Date {
  return dfAddMonths(d, months)
}

export function last12MonthKeys(reference = new Date()): string[] {
  const keys: string[] = []
  for (let i = 11; i >= 0; i -= 1) {
    const d = dfAddMonths(reference, -i)
    keys.push(getMonthKey(d.getFullYear(), d.getMonth()))
  }
  return keys
}

export function formatMonthKeyShort(key: string): string {
  const { year, month } = parseMonthKey(key)
  const label = new Date(year, month, 1).toLocaleDateString("es-ES", { month: "short" })
  return label.charAt(0).toUpperCase() + label.slice(1, 3)
}
