import { createContext, useContext } from "react"

export type SuperadminViewMode = "tramitacion" | "comercial"

const SuperadminViewModeContext = createContext<SuperadminViewMode | undefined>(undefined)

export const SuperadminViewModeProvider = SuperadminViewModeContext.Provider

export function useSuperadminViewMode(): SuperadminViewMode | undefined {
  return useContext(SuperadminViewModeContext)
}
