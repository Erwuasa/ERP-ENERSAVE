import type { SubtipoProspecto } from "./types"

const SUBTIPO_BADGE_CLASSES: Record<SubtipoProspecto, string> = {
  base_datos:
    "bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-400/30",
  vecino_zona:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
  contacto_previo:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25",
  referido:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25",
}

const NEUTRAL_SUBTIPO_CLASS =
  "bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/20"

export function getSubtipoBadgeClass(subtipo: SubtipoProspecto): string {
  return SUBTIPO_BADGE_CLASSES[subtipo] ?? NEUTRAL_SUBTIPO_CLASS
}
