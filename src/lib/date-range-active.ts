import { toIsoDate, type DateRangePickerValue } from "./date-range"

export const EMPTY_DATE_RANGE: DateRangePickerValue = {
  from: null,
  to: null,
  presetId: undefined,
}

function sameDate(a: Date | null, b: Date | null): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return toIsoDate(a) === toIsoDate(b)
}

export function isDateRangeFilterActive(
  value: DateRangePickerValue,
  defaultValue: DateRangePickerValue = EMPTY_DATE_RANGE
): boolean {
  if (value.presetId !== defaultValue.presetId) {
    if (value.presetId || defaultValue.presetId) return true
  }
  return !sameDate(value.from, defaultValue.from) || !sameDate(value.to, defaultValue.to)
}
