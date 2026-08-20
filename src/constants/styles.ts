/**
 * Clases Tailwind reutilizables — alineadas con tokens en src/index.css (@theme inline).
 * Misma convención que Festiva: CSS variables → @theme → clases aquí.
 */

export const fonts = {
  sans: "font-sans",
  mono: "font-mono",
} as const

export const radius = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
} as const

export const colors = {
  bg: "bg-brand-bg",
  panel: "bg-brand-panel",
  surface: "bg-brand-surface",
  elevated: "bg-brand-elevated",
  border: "border-brand-border",
  text: "text-brand-text",
  subtext: "text-brand-subtext",
  accent: "text-brand-accent",
  primary: "bg-primary text-primary-foreground",
} as const

export const shadows = {
  card: "shadow-card",
  panel: "shadow-panel",
} as const

export const labels = {
  field: "block text-[10px] font-mono uppercase text-brand-subtext",
  badge: "text-[10px] font-mono font-bold text-brand-subtext tabular-nums",
} as const

export const inputs = {
  base: "w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text focus:border-ring focus:ring-2 focus:ring-ring/20 focus:outline-none",
  textarea:
    "w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-none focus:border-ring focus:ring-2 focus:ring-ring/20 focus:outline-none",
} as const

export const panels = {
  dropdown: "bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1",
  card: "bg-brand-panel border border-brand-border rounded-xl shadow-card",
  page: "bg-brand-panel border border-brand-border rounded-2xl shadow-card",
} as const

export const badges = {
  count:
    "inline-flex min-w-[1.25rem] justify-center px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground",
} as const

export const layout = {
  container: "container-page",
  fadeIn: "animate-fade-in",
} as const

export const sidebar = {
  widthExpanded: 280,
  widthCollapsed: 76,
  mobileOverlay: "fixed inset-y-0 left-0 z-40 w-[280px] shadow-2xl",
  backdrop: "fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden",
  mobileHeader: "lg:hidden shrink-0 h-14 border-b border-brand-border bg-brand-panel flex items-center justify-between px-4 z-10",
} as const

/** Coincide con --transition-base en src/index.css */
export const motion = {
  transition: "duration-200 ease-in-out",
} as const
