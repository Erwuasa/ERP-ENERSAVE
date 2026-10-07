import { type ReactNode } from "react"
import { useErpWorkspace } from "@/pages/erp/hooks/useErpWorkspace"
import { ErpWorkspaceContext } from "@/pages/erp/providers/erp-workspace-context"
import { SuperadminViewModeProvider } from "@/providers/superadmin-view-mode-context"

export { useErpWorkspaceContext } from "@/pages/erp/providers/erp-workspace-context"
export type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

export function ErpWorkspaceProvider({ children }: { children: ReactNode }) {
  const ws = useErpWorkspace()
  return (
    <ErpWorkspaceContext.Provider value={ws}>
      <SuperadminViewModeProvider value={ws.superadminViewMode}>{children}</SuperadminViewModeProvider>
    </ErpWorkspaceContext.Provider>
  )
}
