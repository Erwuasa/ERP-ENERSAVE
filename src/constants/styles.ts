/**
 * Clases Tailwind reutilizables — alineadas con tokens en src/index.css (@theme brand-*).
 * Usar en componentes para evitar duplicar strings largos.
 */

export const fonts = {
  sans: "font-sans",
  mono: "font-mono",
} as const

export const labels = {
  field: "block text-[10px] font-mono uppercase text-brand-subtext",
  badge: "text-[10px] font-mono font-bold text-brand-subtext tabular-nums",
} as const

export const inputs = {
  base: "w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text",
  textarea:
    "w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-none",
} as const

export const panels = {
  dropdown:
    "bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1",
  card: "bg-brand-panel border border-brand-border rounded-xl",
} as const

export const badges = {
  count:
    "inline-flex min-w-[1.25rem] justify-center px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-brand-panel",
} as const
