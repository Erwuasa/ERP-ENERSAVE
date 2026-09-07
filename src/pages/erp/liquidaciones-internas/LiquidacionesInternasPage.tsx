import { LiquidacionesInternasPanel } from "@/components/LiquidacionesInternasPanel"
import { SensitiveScreenShell } from "@/components/SensitiveScreenShell"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export function LiquidacionesInternasPage() {
  const ws = useErpWorkspaceContext()
  const {
    activeRole,
    activeUser,
    activeUserId,
    settlements,
    contracts,
    profiles,
    formatCurrency,
    canGenerateAutofactura,
    autofacturaEnabled,
    canEditFiscalProfile,
    activeUserFiscalComplete,
    autofacturaTipoCliente,
    proximaFechaAutofacturaLabel,
    handleGenerateAutofactura,
    openFiscalProfile,
  } = ws

  return (
    <SensitiveScreenShell
      userLabel={activeUser.fullName}
      showWatermark={false}
      className="min-h-0 overflow-hidden"
    >
      <LiquidacionesInternasPanel
        activeRole={
          activeRole === "superadmin" || activeRole === "tramitacion"
            ? activeRole
            : (activeRole as "jefe_comercial" | "comercial")
        }
        activeUserId={activeUserId}
        activeUserName={activeUser.fullName}
        settlements={settlements}
        contracts={contracts}
        profiles={profiles}
        formatCurrency={formatCurrency}
        canGenerateAutofactura={canGenerateAutofactura}
        autofacturaEnabled={autofacturaEnabled}
        fiscalProfileComplete={activeUserFiscalComplete}
        onGenerateAutofactura={handleGenerateAutofactura}
        onOpenFiscalProfile={canEditFiscalProfile ? openFiscalProfile : undefined}
      />
    </SensitiveScreenShell>
  )
}
