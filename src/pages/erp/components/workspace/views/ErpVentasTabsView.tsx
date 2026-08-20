import { mapVentasRole } from "@/types/profile"
import { PipelinePage } from "@/components/ventas/PipelinePage"
import { MiDiaPage } from "@/components/ventas/MiDiaPage"
import { FichaProspecto } from "@/components/ventas/FichaProspecto"
import { ReportingPage } from "@/components/ventas/ReportingPage"
import { SlaAvisosPage } from "@/components/ventas/SlaAvisosPage"
import { EnersaveLeadDatabasePage } from "@/components/ventas/EnersaveLeadDatabasePage"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

type Props = { ws: ErpWorkspaceContext }

export function ErpVentasTabsView({ ws }: Props) {
  const {
    activeModule,
    currentMenuTab,
    activeRole,
    activeUser,
    activeUserId,
    profiles,
    contracts,
    ventasFichaProspectoId,
    ventasFichaSnapshot,
    ventasPipelineCentroMandoId,
    openVentasFicha,
    closeVentasFicha,
    openVentasPipelineCentroMando,
    setVentasPipelineCentroMandoId,
    setCurrentMenuTab,
    prospectoImportSources,
    navigateToContratoFromFicha,
    getContractEstadoForProspecto,
    openContractWizardForProspecto,
  } = ws

  const actor = {
    comercialId: activeUserId,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeRole),
  }

  return (
    <>
      {currentMenuTab === "Mi Día" && activeModule === "ventas" && (
        <MiDiaPage
          actor={actor}
          contracts={contracts}
          importSources={prospectoImportSources}
          onOpenFicha={openVentasFicha}
          onNavigateTab={(tab) => setCurrentMenuTab(tab)}
          onOpenPipelineProspecto={openVentasPipelineCentroMando}
        />
      )}
      {currentMenuTab === "Pipeline" && activeModule === "ventas" && (
        <PipelinePage
          actor={actor}
          profiles={profiles.map((p) => ({ id: p.id, fullName: p.fullName, role: p.role }))}
          importSources={prospectoImportSources}
          contracts={contracts}
          onOpenFicha={openVentasFicha}
          onNavigateToContratos={navigateToContratoFromFicha}
          getContractCups={(id) => contracts.find((c) => c.id === id)?.cups}
          openCentroMandoProspectoId={ventasPipelineCentroMandoId}
          onCentroMandoClosed={() => setVentasPipelineCentroMandoId(null)}
        />
      )}
      {currentMenuTab === "Base EnerSave" && activeModule === "ventas" && (
        <EnersaveLeadDatabasePage />
      )}
      {currentMenuTab === "Reporting" && activeModule === "ventas" && (
        <ReportingPage
          actor={actor}
          profiles={profiles.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            role: p.role,
            managerId: p.managerId,
          }))}
        />
      )}
      {currentMenuTab === "Avisos SLA" && activeModule === "ventas" && (
        <SlaAvisosPage
          actor={actor}
          profiles={profiles.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            managerId: p.managerId,
          }))}
          onOpenFicha={openVentasFicha}
        />
      )}
      {ventasFichaProspectoId && activeModule === "ventas" && (
        <FichaProspecto
          prospectoId={ventasFichaProspectoId}
          initialProspecto={ventasFichaSnapshot}
          actor={actor}
          onClose={closeVentasFicha}
          onDeleted={closeVentasFicha}
          onOpenContractWizard={openContractWizardForProspecto}
          onNavigateToContratos={navigateToContratoFromFicha}
          getContractEstado={getContractEstadoForProspecto}
        />
      )}
    </>
  )
}
