import { createContext, useContext, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import type { UserRole } from "@/types/profile"
import { useIncidenciasPage } from "@/pages/erp/incidencias/hooks/useIncidenciasPage"

type IncidenciasContextValue = ReturnType<typeof useIncidenciasPage>

const IncidenciasContext = createContext<IncidenciasContextValue | null>(null)

type ProviderProps = {
  teamMemberIds: string[]
  isErpOpsAdmin: boolean
  children: ReactNode
}

export function IncidenciasProvider({ teamMemberIds, isErpOpsAdmin, children }: ProviderProps) {
  const { activeUserId, activeUser } = useAuth()
  const value = useIncidenciasPage({
    activeRole: activeUser.role as UserRole,
    activeUserId,
    activeUserFullName: activeUser.fullName,
    teamMemberIds,
    isErpOpsAdmin,
  })

  return <IncidenciasContext.Provider value={value}>{children}</IncidenciasContext.Provider>
}

export function useIncidenciasContext(): IncidenciasContextValue {
  const ctx = useContext(IncidenciasContext)
  if (!ctx) {
    throw new Error("useIncidenciasContext must be used within IncidenciasProvider")
  }
  return ctx
}
