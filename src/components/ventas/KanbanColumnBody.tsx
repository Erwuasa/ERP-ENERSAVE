import { useEffect, useRef, useState, type ReactNode } from "react"

interface KanbanColumnBodyProps {
  children: ReactNode
  className?: string
}

export function KanbanColumnBody({ children, className = "" }: KanbanColumnBodyProps) {
  const [hovered, setHovered] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hovered) return

    function onWheel(e: WheelEvent) {
      if (el.scrollHeight <= el.clientHeight) return

      const atTop = el.scrollTop <= 0
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1

      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return

      e.preventDefault()
      e.stopPropagation()
      el.scrollTop += e.deltaY
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [hovered])

  return (
    <div
      ref={scrollRef}
      className={`flex-1 min-h-0 transition-colors ${
        hovered
          ? "overflow-y-auto overscroll-y-contain touch-pan-y [scrollbar-width:thin] bg-brand-bg/20"
          : "overflow-y-hidden"
      } ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  )
}
