import { createContext, useContext } from "react"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

export const ErpWorkspaceContext = createContext<ErpWorkspaceContext | null>(null)

export function useErpWorkspaceContext(): ErpWorkspaceContext {
  const ctx = useContext(ErpWorkspaceContext)
  if (!ctx) {
    throw new Error("useErpWorkspaceContext debe usarse dentro de ErpWorkspaceProvider")
  }
  return ctx
}
