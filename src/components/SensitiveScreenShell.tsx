import { type ReactNode } from "react"
import {
  SENSITIVE_SCREEN_ROOT_ID,
  useDevToolsConfidentialityNotice,
  useSensitiveScreenContextMenu,
} from "../hooks/use-sensitive-screen-protection"
import { cn } from "../lib/utils"

interface SensitiveScreenShellProps {
  userLabel: string
  children: ReactNode
  className?: string
}

const WATERMARK_TILE_COUNT = 28

function SensitiveScreenWatermark({ label }: { label: string }) {
  const tiles = Array.from({ length: WATERMARK_TILE_COUNT }, (_, index) => index)

  return (
    <div className="sensitive-screen-watermark pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      {tiles.map((index) => (
        <span key={index} className="sensitive-screen-watermark-tile">
          {label}
        </span>
      ))}
    </div>
  )
}

export function SensitiveScreenShell({ userLabel, children, className }: SensitiveScreenShellProps) {
  useSensitiveScreenContextMenu()
  const showDevToolsNotice = useDevToolsConfidentialityNotice()
  const trimmedLabel = userLabel.trim() || "Usuario"

  return (
    <div
      id={SENSITIVE_SCREEN_ROOT_ID}
      className={cn("sensitive-screen-root relative flex min-h-0 flex-1 flex-col", className)}
    >
      <SensitiveScreenWatermark label={trimmedLabel} />

      {showDevToolsNotice && (
        <div className="sensitive-screen-devtools-notice" role="status">
          Recuerda que esta información es confidencial
        </div>
      )}

      <div className={cn("relative z-[2] flex min-h-0 flex-1 flex-col", className && "overflow-hidden")}>
        {children}
      </div>
    </div>
  )
}
