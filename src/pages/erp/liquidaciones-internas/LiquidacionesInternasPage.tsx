import { LiquidacionesInternasPanel } from "@/components/LiquidacionesInternasPanel"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export function LiquidacionesInternasPage() {
  const ws = useErpWorkspaceContext()
  const {
    activeRole,
    activeUser,
    activeUserId,
    superadminViewMode,
    settlements,
    contracts,
    profiles,
    formatCurrency,
  } = ws

  return (
    <LiquidacionesInternasPanel
      activeRole={
        activeRole === "superadmin"
          ? superadminViewMode === "comercial"
            ? "comercial"
            : "superadmin"
          : (activeRole as "jefe_comercial" | "comercial")
      }
      activeUserId={activeUserId}
      activeUserName={activeUser.fullName}
      settlements={settlements}
      contracts={contracts}
      profiles={profiles}
      formatCurrency={formatCurrency}
    />
  )
}
