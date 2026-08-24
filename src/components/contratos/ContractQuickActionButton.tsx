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
  { base: string; hover: string }
> = {
  edit: {
    base: "text-cyan-600 border-cyan-500/40 bg-cyan-500/10",
    hover: "hover:text-cyan-700 hover:border-cyan-500/60 hover:bg-cyan-500/20",
  },
  recommendation: {
    base: "text-amber-500 border-amber-500/40 bg-amber-500/12",
    hover: "hover:text-amber-600 hover:border-amber-500/65 hover:bg-amber-500/22",
  },
  renewal: {
    base: "text-orange-500 border-orange-500/40 bg-orange-500/12",
    hover: "hover:text-orange-600 hover:border-orange-500/65 hover:bg-orange-500/22",
  },
  penalty: {
    base: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10",
    hover: "hover:text-emerald-700 hover:border-emerald-500/60 hover:bg-emerald-500/20",
  },
  danger: {
    base: "text-rose-600 border-rose-500/40 bg-rose-500/10",
    hover: "hover:text-rose-700 hover:border-rose-500/60 hover:bg-rose-500/20",
  },
  muted: {
    base: "text-brand-subtext/50 border-brand-border/45 bg-brand-surface/40",
    hover: "",
  },
}

interface ContractQuickActionButtonProps {
  tone: ContractQuickActionTone
  title: string
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
}

export function ContractQuickActionButton({
  tone,
  title,
  ariaLabel,
  onClick,
  disabled = false,
  children,
}: ContractQuickActionButtonProps) {
  const palette = TONE_CLASS[disabled ? "muted" : tone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={`p-1 rounded-md border transition-colors cursor-pointer disabled:cursor-not-allowed ${palette.base} ${disabled ? "" : palette.hover}`}
    >
      {children}
    </button>
  )
}
