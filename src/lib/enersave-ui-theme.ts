/** Paleta y clases Tailwind compartidas — verde, azul y blanco EnerSave. */

export type SupplyKind = "luz" | "gas" | "telefonia"

export interface SupplyKindTheme {
  badge: string
  tabActive: string
  tabInactive: string
  icon: string
  kpiValue: string
  kpiAccent: string
}

const KPI_SELECTED =
  "border-slate-300/90 dark:border-slate-500 bg-brand-panel shadow-card ring-1 ring-inset ring-slate-900/[0.05] dark:ring-white/[0.07]"

const KPI_DEFAULT =
  "border-brand-border shadow-sm hover:border-slate-300/70 dark:hover:border-slate-500/50 hover:shadow-card"

export const SUPPLY_KIND_THEME: Record<SupplyKind, SupplyKindTheme> = {
  luz: {
    badge: "bg-cyan-500/12 text-cyan-800 dark:text-cyan-300 border border-cyan-500/20",
    tabActive: `${KPI_SELECTED} text-cyan-900 dark:text-cyan-200`,
    tabInactive:
      "border-brand-border text-brand-subtext hover:border-slate-300/70 hover:text-brand-text dark:hover:border-slate-500/50",
    icon: "text-cyan-600 dark:text-cyan-400",
    kpiValue: "text-cyan-600 dark:text-cyan-400",
    kpiAccent: "bg-cyan-500",
  },
  gas: {
    badge: "bg-orange-500/12 text-orange-800 dark:text-orange-300 border border-orange-500/20",
    tabActive: `${KPI_SELECTED} text-orange-900 dark:text-orange-200`,
    tabInactive:
      "border-brand-border text-brand-subtext hover:border-slate-300/70 hover:text-brand-text dark:hover:border-slate-500/50",
    icon: "text-orange-600 dark:text-orange-500",
    kpiValue: "text-orange-600 dark:text-orange-500",
    kpiAccent: "bg-orange-500",
  },
  telefonia: {
    badge: "bg-blue-500/12 text-blue-800 dark:text-blue-300 border border-blue-500/20",
    tabActive: `${KPI_SELECTED} text-blue-900 dark:text-blue-200`,
    tabInactive:
      "border-brand-border text-brand-subtext hover:border-slate-300/70 hover:text-brand-text dark:hover:border-slate-500/50",
    icon: "text-blue-600 dark:text-blue-400",
    kpiValue: "text-blue-600 dark:text-blue-400",
    kpiAccent: "bg-blue-500",
  },
}

export function supplyTabClass(kind: SupplyKind, isActive: boolean): string {
  const theme = SUPPLY_KIND_THEME[kind]
  return `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-[border-color,box-shadow,background-color,color] duration-200 cursor-pointer ${
    isActive ? theme.tabActive : theme.tabInactive
  }`
}

export function supplyBadgeClass(kind: "luz" | "gas"): string {
  return SUPPLY_KIND_THEME[kind].badge
}

export const CLIENT_TYPE_BADGE = {
  particular:
    "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/20",
  empresa:
    "bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
} as const

export function clientTypeBadgeClass(tipo: "particular" | "empresa"): string {
  return CLIENT_TYPE_BADGE[tipo === "empresa" ? "empresa" : "particular"]
}

export const FILTER_PILL = {
  active:
    "bg-slate-900 text-white border border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm",
  inactive:
    "bg-brand-panel text-brand-subtext border border-brand-border hover:text-brand-text hover:border-slate-300/70 dark:hover:border-slate-500/50",
} as const

export function filterPillClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-[border-color,background-color,color] duration-200 cursor-pointer ${
    active ? FILTER_PILL.active : FILTER_PILL.inactive
  }`
}

export const SEGMENT_TAB = {
  active:
    "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm",
  inactive:
    "text-brand-subtext hover:text-brand-text hover:bg-brand-surface/80 dark:hover:bg-brand-surface/60",
} as const

export function segmentTabClass(active: boolean): string {
  return `px-2.5 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase transition-[background-color,color] duration-200 cursor-pointer whitespace-nowrap ${
    active ? SEGMENT_TAB.active : SEGMENT_TAB.inactive
  }`
}

export const KPI_CARD = {
  base: "relative overflow-hidden text-left rounded-xl border transition-[border-color,box-shadow,background-color] duration-200 bg-brand-panel",
  selected: KPI_SELECTED,
  default: KPI_DEFAULT,
  selectable: "cursor-pointer",
} as const

export function kpiCardClass(options: { selected?: boolean; selectable?: boolean }): string {
  return [
    KPI_CARD.base,
    options.selectable ? KPI_CARD.selectable : "",
    options.selected ? KPI_CARD.selected : KPI_CARD.default,
  ]
    .filter(Boolean)
    .join(" ")
}

export const TABLE_ROW_SELECTED =
  "bg-brand-surface/80 ring-1 ring-inset ring-slate-900/[0.06] dark:ring-white/[0.08]"

export const LIST_ITEM_SELECTED =
  "bg-brand-surface/80 ring-1 ring-inset ring-slate-900/[0.06] dark:ring-white/[0.08]"

export function listItemSelectedClass(isSelected: boolean): string {
  return isSelected ? LIST_ITEM_SELECTED : ""
}

export const FILTER_TRIGGER = {
  open: "border-slate-400 dark:border-slate-500 ring-1 ring-slate-900/[0.08] dark:ring-white/[0.1]",
  active: "border-slate-400/90 dark:border-slate-500/80",
  default: "border-brand-border hover:border-slate-300/80 dark:hover:border-slate-500/60",
} as const

export function filterTriggerBorderClass(options: { open: boolean; active: boolean }): string {
  if (options.open) return FILTER_TRIGGER.open
  if (options.active) return FILTER_TRIGGER.active
  return FILTER_TRIGGER.default
}

export const INTERACTIVE_CARD = {
  hover:
    "transition-[border-color,box-shadow,background-color] duration-200 hover:border-slate-300/70 dark:hover:border-slate-500/50 hover:shadow-card",
} as const

export const ENERSAVE_ACTION = {
  primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
  secondary:
    "border border-brand-border bg-brand-panel text-brand-subtext hover:border-slate-300/70 hover:text-brand-text dark:hover:border-slate-500/50 hover:bg-brand-surface/50",
  iconCyan:
    "p-1.5 rounded-lg bg-brand-surface text-cyan-700 dark:text-cyan-400 hover:bg-brand-elevated border border-brand-border transition-colors cursor-pointer",
  iconEmerald:
    "p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 transition-colors cursor-pointer",
  iconAmber:
    "p-1.5 rounded-lg bg-amber-400/12 text-amber-700 dark:text-amber-400 hover:bg-amber-400/20 border border-amber-400/25 transition-colors cursor-pointer",
} as const

export const PANEL_TOOLBAR =
  "rounded-xl border border-brand-border bg-brand-panel p-3 shadow-sm dark:shadow-none"

export const SEARCH_INPUT =
  "w-full pl-9 pr-8 py-2 bg-brand-surface border border-brand-border rounded-lg focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 text-xs text-brand-text font-medium"
