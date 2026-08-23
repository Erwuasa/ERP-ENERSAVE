import { useEffect, useRef, type ReactNode } from "react"

interface ProtectedDataSurfaceProps {
  children: ReactNode
  watermark?: string
  className?: string
}

function selectionIsInside(node: HTMLElement): boolean {
  const selection = document.getSelection()
  if (!selection || selection.isCollapsed) return false
  const anchor = selection.anchorNode
  return Boolean(anchor && node.contains(anchor))
}

export function ProtectedDataSurface({
  children,
  watermark,
  className = "",
}: ProtectedDataSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    function blockIfInside(event: Event) {
      if (!containerRef.current) return
      if (!selectionIsInside(containerRef.current) && !containerRef.current.contains(event.target as Node)) {
        return
      }
      event.preventDefault()
    }

    node.addEventListener("copy", blockIfInside)
    node.addEventListener("cut", blockIfInside)
    node.addEventListener("contextmenu", blockIfInside)

    return () => {
      node.removeEventListener("copy", blockIfInside)
      node.removeEventListener("cut", blockIfInside)
      node.removeEventListener("contextmenu", blockIfInside)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {watermark ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-[0.035]"
        >
          <div className="absolute inset-0 grid grid-cols-2 gap-16 rotate-[-18deg] scale-110">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className="text-[11px] font-mono font-bold uppercase tracking-widest whitespace-nowrap"
              >
                {watermark}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="relative z-[2]">{children}</div>
    </div>
  )
}
