import type { CSSProperties, HTMLAttributes } from "react"

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Tailwind width class or arbitrary value */
  width?: string
  /** Tailwind height class */
  height?: string
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "none"
}

const ROUNDED: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
}

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
  style,
  ...props
}: SkeletonProps) {
  const mergedStyle: CSSProperties = { ...style }
  if (width?.startsWith("w-")) {
    /* width via className */
  } else if (width) {
    mergedStyle.width = width
  }
  if (height?.startsWith("h-")) {
    /* height via className */
  } else if (height) {
    mergedStyle.height = height
  }

  return (
    <div
      className={`relative overflow-hidden bg-slate-200/80 dark:bg-slate-700/50 ${ROUNDED[rounded]} ${width?.startsWith("w-") ? width : ""} ${height?.startsWith("h-") ? height : ""} ${className}`}
      style={mergedStyle}
      aria-hidden="true"
      {...props}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent"
      />
    </div>
  )
}

export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? "w-3/5" : "w-full"}`}
          rounded="sm"
        />
      ))}
    </div>
  )
}
