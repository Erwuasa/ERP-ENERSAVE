import { type ReactNode } from "react"
import { useErpWorkspace } from "@/pages/erp/hooks/useErpWorkspace"
import { ErpWorkspaceContext } from "@/pages/erp/providers/erp-workspace-context"

export { useErpWorkspaceContext } from "@/pages/erp/providers/erp-workspace-context"
export type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

export function ErpWorkspaceProvider({ children }: { children: ReactNode }) {
  const ws = useErpWorkspace()
  return <ErpWorkspaceContext.Provider value={ws}>{children}</ErpWorkspaceContext.Provider>
}
