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

export const SUPPLY_KIND_THEME: Record<SupplyKind, SupplyKindTheme> = {
  luz: {
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25",
    tabActive:
      "border-cyan-500/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 shadow-sm shadow-cyan-500/10",
    tabInactive:
      "border-brand-border text-brand-subtext hover:border-cyan-500/35 hover:bg-cyan-500/5 hover:text-cyan-700 dark:hover:text-cyan-300",
    icon: "text-cyan-600 dark:text-cyan-400",
    kpiValue: "text-cyan-600 dark:text-cyan-400",
    kpiAccent: "bg-cyan-500",
  },
  gas: {
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25",
    tabActive:
      "border-orange-400/50 bg-orange-400/20 text-orange-800 dark:text-orange-200 shadow-sm shadow-orange-500/10",
    tabInactive:
      "border-brand-border text-brand-subtext hover:border-orange-400/35 hover:bg-orange-400/5 hover:text-orange-700 dark:hover:text-orange-300",
    icon: "text-orange-600 dark:text-orange-500",
    kpiValue: "text-orange-600 dark:text-orange-500",
    kpiAccent: "bg-orange-500",
  },
  telefonia: {
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25",
    tabActive:
      "border-blue-500/50 bg-blue-500/15 text-blue-800 dark:text-blue-200 shadow-sm shadow-blue-500/10",
    tabInactive:
      "border-brand-border text-brand-subtext hover:border-blue-500/35 hover:bg-blue-500/5 hover:text-blue-700 dark:hover:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    kpiValue: "text-blue-600 dark:text-blue-400",
    kpiAccent: "bg-blue-500",
  },
}

export function supplyTabClass(kind: SupplyKind, isActive: boolean): string {
  const theme = SUPPLY_KIND_THEME[kind]
  return `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
    isActive ? theme.tabActive : theme.tabInactive
  }`
}

export function supplyBadgeClass(kind: "luz" | "gas"): string {
  return SUPPLY_KIND_THEME[kind].badge
}

export const CLIENT_TYPE_BADGE = {
  particular:
    "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/25",
  empresa:
    "bg-orange-500/12 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/25",
} as const

export function clientTypeBadgeClass(tipo: "particular" | "empresa"): string {
  return CLIENT_TYPE_BADGE[tipo === "empresa" ? "empresa" : "particular"]
}

export const FILTER_PILL = {
  active:
    "bg-emerald-600 text-white border border-emerald-600 shadow-sm shadow-emerald-500/15",
  inactive:
    "bg-brand-surface text-brand-subtext border border-brand-border hover:text-brand-text hover:border-cyan-500/35 hover:bg-cyan-500/5",
} as const

export function filterPillClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
    active ? FILTER_PILL.active : FILTER_PILL.inactive
  }`
}

export const KPI_CARD = {
  base: "relative overflow-hidden text-left rounded-xl border shadow-sm transition-colors duration-200 bg-brand-panel",
  selected: "border-cyan-500/45 bg-cyan-500/5 ring-1 ring-cyan-500/20",
  default: "border-brand-border hover:border-cyan-500/30",
  selectable: "cursor-pointer",
} as const

export const ENERSAVE_ACTION = {
  primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
  secondary:
    "border border-brand-border bg-brand-panel text-brand-subtext hover:border-cyan-500/35 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-500/5",
  iconCyan:
    "p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors cursor-pointer",
  iconEmerald:
    "p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer",
  iconAmber:
    "p-1.5 rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 hover:bg-amber-400/25 border border-amber-400/30 transition-colors cursor-pointer",
} as const

export const PANEL_TOOLBAR =
  "rounded-xl border border-brand-border bg-brand-panel p-3 shadow-sm dark:shadow-none"

export const SEARCH_INPUT =
  "w-full pl-9 pr-8 py-2 bg-brand-surface border border-brand-border rounded-lg focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/15 text-xs text-brand-text font-medium"
