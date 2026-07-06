import type { ReactNode } from "react"

interface MiDiaHoverTipProps {
  label: string
  children: ReactNode
  className?: string
  position?: "top" | "bottom"
}

/** Tooltip tipo nube al hover/focus (sin dependencias externas). */
export function MiDiaHoverTip({
  label,
  children,
  className = "",
  position = "top",
}: MiDiaHoverTipProps) {
  const positionClasses =
    position === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : "top-full left-1/2 -translate-x-1/2 mt-2"

  const arrowClasses =
    position === "top"
      ? "top-full left-1/2 -translate-x-1/2 border-t-slate-800 dark:border-t-slate-600"
      : "bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 dark:border-b-slate-600"

  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${positionClasses} z-[60] max-w-[220px] px-2.5 py-1.5 text-[10px] font-medium leading-snug text-white bg-slate-800 dark:bg-slate-600 rounded-lg shadow-lg opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100 transition-all duration-150 whitespace-normal text-center`}
      >
        {label}
        <span
          className={`absolute border-4 border-transparent ${arrowClasses}`}
          aria-hidden
        />
      </span>
    </span>
  )
}
