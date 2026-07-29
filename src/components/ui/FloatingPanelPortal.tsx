import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"

interface FloatingPanelPortalProps {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  align?: "left" | "right"
  className?: string
  children: ReactNode
  maxWidth?: number
}

export function FloatingPanelPortal({
  open,
  onClose,
  anchorRef,
  align = "left",
  className = "",
  children,
  maxWidth = 640,
}: FloatingPanelPortalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open) return

    function place() {
      const anchor = anchorRef.current
      const panel = panelRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const margin = 8
      const panelW = Math.min(
        panel?.offsetWidth ?? maxWidth,
        window.innerWidth - margin * 2
      )
      const panelH = panel?.offsetHeight ?? 320

      let left = align === "right" ? rect.right - panelW : rect.left
      left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin))

      let top = rect.bottom + 4
      if (top + panelH > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - panelH - 4)
      }

      setCoords({ top, left })
    }

    place()
    const raf = requestAnimationFrame(place)
    window.addEventListener("scroll", place, true)
    window.addEventListener("resize", place)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", place, true)
      window.removeEventListener("resize", place)
    }
  }, [open, align, maxWidth, anchorRef])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 200 }}
      className={className}
    >
      {children}
    </div>,
    document.body
  )
}
