import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Number of columns on wide screens; narrower viewports collapse automatically. */
export type KpiGridColumns = 2 | 3 | 4 | 5 | 6 | 7

const COLUMNS_CLASS: Record<KpiGridColumns, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
  7: "grid-cols-2 md:grid-cols-4 2xl:grid-cols-7",
}

interface KpiGridProps {
  columns?: KpiGridColumns
  children: ReactNode
  className?: string
  "aria-label"?: string
}

export function KpiGrid({ columns = 4, children, className, "aria-label": ariaLabel }: KpiGridProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("grid gap-2.5 sm:gap-3", COLUMNS_CLASS[columns], className)}
    >
      {children}
    </div>
  )
}

/** Clamps a card count into the supported column range. */
export function kpiColumnsFor(count: number): KpiGridColumns {
  return Math.min(7, Math.max(2, count)) as KpiGridColumns
}
