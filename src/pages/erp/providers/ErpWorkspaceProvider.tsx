import { createContext, useContext, type ReactNode } from "react"
import {
  useErpWorkspace,
  type ErpWorkspaceContext,
} from "@/pages/erp/hooks/useErpWorkspace"

const ErpWorkspaceCtx = createContext<ErpWorkspaceContext | null>(null)

export function ErpWorkspaceProvider({ children }: { children: ReactNode }) {
  const ws = useErpWorkspace()
  return <ErpWorkspaceCtx.Provider value={ws}>{children}</ErpWorkspaceCtx.Provider>
}

export function useErpWorkspaceContext(): ErpWorkspaceContext {
  const ctx = useContext(ErpWorkspaceCtx)
  if (!ctx) {
    throw new Error("useErpWorkspaceContext debe usarse dentro de ErpWorkspaceProvider")
  }
  return ctx
}
