export type KpiTone =
  | "neutral"
  | "cyan"
  | "blue"
  | "emerald"
  | "amber"
  | "orange"
  | "rose"
  | "violet"
  | "indigo"

/** Icon chip classes per tone. Kept as full literals so Tailwind can detect them. */
export const KPI_TONE_CHIP: Record<KpiTone, string> = {
  neutral: "bg-brand-surface text-brand-subtext",
  cyan: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
  blue: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  orange: "bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  rose: "bg-rose-500/10 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  violet: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  indigo: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
}
