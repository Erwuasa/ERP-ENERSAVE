export const CALENDARIO_ECONOMICO_MONTHS = [
  { id: "ene", label: "Ene" },
  { id: "feb", label: "Feb" },
  { id: "mar", label: "Mar" },
  { id: "abr", label: "Abr" },
  { id: "may", label: "May" },
  { id: "jun", label: "Jun" },
  { id: "jul", label: "Jul" },
  { id: "ago", label: "Ago" },
  { id: "sep", label: "Sep" },
  { id: "oct", label: "Oct" },
  { id: "nov", label: "Nov" },
  { id: "dic", label: "Dic" },
] as const

export type CalendarioEconomicoMonthId = (typeof CALENDARIO_ECONOMICO_MONTHS)[number]["id"]

export const CALENDARIO_ECONOMICO_PERIODS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const

export type CalendarioEconomicoPeriodId = (typeof CALENDARIO_ECONOMICO_PERIODS)[number]

export type CalendarioEconomicoConfig = Record<CalendarioEconomicoMonthId, CalendarioEconomicoPeriodId[]>

export const CALENDARIO_ECONOMICO_STORAGE_KEY = "enersave-calendario-economico-v1"

export const DEFAULT_CALENDARIO_ECONOMICO: CalendarioEconomicoConfig = {
  ene: ["p1", "p2", "p6"],
  feb: ["p1", "p2", "p6"],
  mar: ["p1", "p2", "p6"],
  abr: ["p4", "p5", "p6"],
  may: ["p4", "p5", "p6"],
  jun: ["p3", "p4", "p5"],
  jul: ["p1", "p2", "p6"],
  ago: ["p1", "p2", "p6"],
  sep: ["p3", "p4", "p5"],
  oct: ["p3", "p4", "p5"],
  nov: ["p3", "p4", "p5"],
  dic: ["p1", "p2", "p6"],
}

export function loadCalendarioEconomicoConfig(): CalendarioEconomicoConfig {
  if (typeof window === "undefined") return DEFAULT_CALENDARIO_ECONOMICO
  try {
    const raw = window.localStorage.getItem(CALENDARIO_ECONOMICO_STORAGE_KEY)
    if (!raw) return DEFAULT_CALENDARIO_ECONOMICO
    const parsed = JSON.parse(raw) as CalendarioEconomicoConfig
    return { ...DEFAULT_CALENDARIO_ECONOMICO, ...parsed }
  } catch {
    return DEFAULT_CALENDARIO_ECONOMICO
  }
}

export function saveCalendarioEconomicoConfig(config: CalendarioEconomicoConfig): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CALENDARIO_ECONOMICO_STORAGE_KEY, JSON.stringify(config))
}

export function countActivePeriodsForMonth(
  config: CalendarioEconomicoConfig,
  monthId: CalendarioEconomicoMonthId
): number {
  return config[monthId]?.length ?? 0
}

export function isCalendarioEconomicoValid(config: CalendarioEconomicoConfig): boolean {
  return CALENDARIO_ECONOMICO_MONTHS.every(
    (month) => countActivePeriodsForMonth(config, month.id) === 3
  )
}

export function toggleCalendarioPeriod(
  config: CalendarioEconomicoConfig,
  monthId: CalendarioEconomicoMonthId,
  periodId: CalendarioEconomicoPeriodId
): CalendarioEconomicoConfig {
  const current = config[monthId] ?? []
  const next = current.includes(periodId)
    ? current.filter((item) => item !== periodId)
    : [...current, periodId]
  return { ...config, [monthId]: next }
}

const MONTH_INDEX_TO_ID: CalendarioEconomicoMonthId[] = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

/** Mes calendario activo según la fecha local del navegador (0 = ene … 11 = dic). */
export function getCurrentCalendarioMonthId(date = new Date()): CalendarioEconomicoMonthId {
  return MONTH_INDEX_TO_ID[date.getMonth()] ?? "ene"
}

export function isCurrentCalendarioMonth(
  monthId: CalendarioEconomicoMonthId,
  date = new Date()
): boolean {
  return getCurrentCalendarioMonthId(date) === monthId
}
