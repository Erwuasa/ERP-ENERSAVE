import { createPortal } from "react-dom"
import type { ReactNode } from "react"

/** Portal sin backdrop: útil para sheets laterales con layout propio. */
export function AppFullScreenPortal({
  open,
  children,
}: {
  open: boolean
  children: ReactNode
}) {
  if (!open || typeof document === "undefined") return null
  return createPortal(children, document.body)
}

interface AppFullScreenModalProps {
  open: boolean
  children: ReactNode
  onClose?: () => void
  zIndex?: number
  backdropClassName?: string
  panelClassName?: string
  closeOnBackdrop?: boolean
}

/**
 * Modal a pantalla completa vía portal en document.body.
 * Cubre sidebar y contenido con el mismo backdrop difuminado.
 */
export function AppFullScreenModal({
  open,
  children,
  onClose,
  zIndex = 100,
  backdropClassName = "bg-black/60 backdrop-blur-sm",
  panelClassName,
  closeOnBackdrop = true,
}: AppFullScreenModalProps) {
  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${backdropClassName}`}
      style={{ zIndex }}
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}
