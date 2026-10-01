import type { ReactNode } from "react"

export type ContractQuickActionTone =
  | "edit"
  | "recommendation"
  | "penalty"
  | "danger"
  | "muted"
  | "renewal"

const TONE_CLASS: Record<
  ContractQuickActionTone,
  { idle: string; hover: string; focusRing: string }
> = {
  edit: {
    idle: "text-slate-500 dark:text-slate-400",
    hover:
      "hover:text-cyan-600 hover:bg-cyan-500/10 dark:hover:text-cyan-400 dark:hover:bg-cyan-500/15",
    focusRing: "focus-visible:ring-cyan-500/35",
  },
  recommendation: {
    idle: "text-amber-600/90 dark:text-amber-400/90",
    hover:
      "hover:text-amber-700 hover:bg-amber-500/12 dark:hover:text-amber-300 dark:hover:bg-amber-500/18",
    focusRing: "focus-visible:ring-amber-500/40",
  },
  renewal: {
    idle: "text-orange-600/85 dark:text-orange-400/90",
    hover:
      "hover:text-orange-700 hover:bg-orange-500/12 dark:hover:text-orange-300 dark:hover:bg-orange-500/18",
    focusRing: "focus-visible:ring-orange-500/40",
  },
  penalty: {
    idle: "text-emerald-600/90 dark:text-emerald-400/90",
    hover:
      "hover:text-emerald-700 hover:bg-emerald-500/10 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/15",
    focusRing: "focus-visible:ring-emerald-500/35",
  },
  danger: {
    idle: "text-slate-500 dark:text-slate-400",
    hover:
      "hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:bg-rose-500/15",
    focusRing: "focus-visible:ring-rose-500/35",
  },
  muted: {
    idle: "text-brand-subtext/45",
    hover: "",
    focusRing: "focus-visible:ring-brand-border/50",
  },
}

interface ContractQuickActionButtonProps {
  tone: ContractQuickActionTone
  title: string
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  size?: "sm" | "md"
  children: ReactNode
}

export function ContractQuickActionButton({
  tone,
  title,
  ariaLabel,
  onClick,
  disabled = false,
  size = "sm",
  children,
}: ContractQuickActionButtonProps) {
  const palette = TONE_CLASS[disabled ? "muted" : tone]
  const dimension = size === "md" ? "h-8 w-8" : "h-7 w-7"

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-lg bg-transparent transition-colors duration-200 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-brand-panel ${palette.idle} ${disabled ? "" : palette.hover} ${palette.focusRing}`}
    >
      <span className="inline-flex items-center justify-center [&>svg]:size-[15px] [&>svg]:shrink-0 [&>svg]:stroke-[1.75]">
        {children}
      </span>
    </button>
  )
}
