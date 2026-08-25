import { LiquidacionesInternasPanel } from "@/components/LiquidacionesInternasPanel"
import { SensitiveScreenShell } from "@/components/SensitiveScreenShell"
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
    canGenerateAutofactura,
    canEditFiscalProfile,
    activeUserFiscalComplete,
    autofacturaTipoCliente,
    proximaFechaAutofacturaLabel,
    handleGenerateAutofactura,
    openFiscalProfile,
  } = ws

  return (
    <SensitiveScreenShell userLabel={activeUser.fullName}>
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
        canGenerateAutofactura={canGenerateAutofactura}
        fiscalProfileComplete={activeUserFiscalComplete}
        autofacturaTipoCliente={autofacturaTipoCliente}
        proximaFechaAutofacturaLabel={proximaFechaAutofacturaLabel}
        onGenerateAutofactura={handleGenerateAutofactura}
        onOpenFiscalProfile={canEditFiscalProfile ? openFiscalProfile : undefined}
      />
    </SensitiveScreenShell>
  )
}
