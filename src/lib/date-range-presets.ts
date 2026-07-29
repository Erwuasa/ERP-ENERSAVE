import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subMonths,
  subQuarters,
  subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"

export const CUSTOM_PRESET_ID = "personalizado"
export const DEFAULT_PRESET_ID = "este_mes"

const WEEK_OPTS = { locale: es, weekStartsOn: 1 as const }

export interface DateRangePreset {
  id: string
  label: string
  getRange: (reference?: Date) => { from: Date; to: Date }
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: "hoy",
    label: "Hoy",
    getRange: (reference = new Date()) => {
      const day = startOfDay(reference)
      return { from: day, to: endOfDay(reference) }
    },
  },
  {
    id: "esta_semana",
    label: "Esta semana",
    getRange: (reference = new Date()) => ({
      from: startOfWeek(reference, WEEK_OPTS),
      to: endOfWeek(reference, WEEK_OPTS),
    }),
  },
  {
    id: "ultimas_2_semanas",
    label: "Últimas 2 semanas",
    getRange: (reference = new Date()) => ({
      from: startOfDay(subWeeks(reference, 2)),
      to: endOfDay(reference),
    }),
  },
  {
    id: "este_mes",
    label: "Este mes",
    getRange: (reference = new Date()) => ({
      from: startOfMonth(reference),
      to: endOfDay(reference),
    }),
  },
  {
    id: "mes_anterior",
    label: "Mes anterior",
    getRange: (reference = new Date()) => {
      const prev = subMonths(reference, 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    },
  },
  {
    id: "este_trimestre",
    label: "Este trimestre",
    getRange: (reference = new Date()) => ({
      from: startOfQuarter(reference),
      to: endOfDay(reference),
    }),
  },
  {
    id: "trimestre_anterior",
    label: "Trimestre anterior",
    getRange: (reference = new Date()) => {
      const prev = subQuarters(reference, 1)
      return { from: startOfQuarter(prev), to: endOfQuarter(prev) }
    },
  },
  {
    id: CUSTOM_PRESET_ID,
    label: "Personalizado",
    getRange: (reference = new Date()) => ({
      from: startOfMonth(reference),
      to: endOfDay(reference),
    }),
  },
]

export function getPresetById(id: string): DateRangePreset | undefined {
  return DATE_RANGE_PRESETS.find((p) => p.id === id)
}

export function getDefaultDateRangePickerValue(reference = new Date()) {
  const preset = getPresetById(DEFAULT_PRESET_ID)!
  const { from, to } = preset.getRange(reference)
  return { from, to, presetId: DEFAULT_PRESET_ID }
}
