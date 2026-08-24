import { createContext, useContext } from "react"
import type { ErpWorkspaceContext as ErpWorkspaceValue } from "@/pages/erp/hooks/useErpWorkspace"

export const ErpWorkspaceContext = createContext<ErpWorkspaceValue | null>(null)

export function useErpWorkspaceContext(): ErpWorkspaceValue {
  const ctx = useContext(ErpWorkspaceContext)
  if (!ctx) {
    throw new Error("useErpWorkspaceContext debe usarse dentro de ErpWorkspaceProvider")
  }
  return ctx
}
