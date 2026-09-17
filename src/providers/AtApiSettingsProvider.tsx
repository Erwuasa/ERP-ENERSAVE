import { createContext, useContext, type ReactNode } from "react"
import { useAtOutboundSettings } from "@/hooks/use-at-outbound-settings"

interface AtApiSettingsValue {
  active: boolean
  busy: boolean
  canToggle: boolean
  toggle: () => Promise<void>
}

const AtApiSettingsContext = createContext<AtApiSettingsValue | null>(null)

export function AtApiSettingsProvider({
  children,
  canToggle,
}: {
  children: ReactNode
  canToggle: boolean
}) {
  const settings = useAtOutboundSettings()
  return (
    <AtApiSettingsContext.Provider value={{ ...settings, canToggle }}>
      {children}
    </AtApiSettingsContext.Provider>
  )
}

export function useAtApiSettings(): AtApiSettingsValue {
  const ctx = useContext(AtApiSettingsContext)
  if (!ctx) {
    throw new Error("useAtApiSettings debe usarse dentro de AtApiSettingsProvider")
  }
  return ctx
}
