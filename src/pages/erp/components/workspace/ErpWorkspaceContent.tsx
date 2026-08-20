import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"
import {
  LazyWorkspaceTab,
  ErpDashboardView,
  ErpUsuariosView,
  ErpLiquidacionesExternasView,
  ErpMiEquipoView,
  ErpComparadorView,
  ErpHistorialView,
  ErpIncidenciasView,
  ErpVentasTabsView,
  ErpMisClientesView,
  ErpCatalogTabsView,
  ContratosPage,
  LiquidacionesInternasPanel,
  CashflowPage,
} from "@/pages/erp/components/workspace/workspace-lazy-tabs"

type Props = { ws: ErpWorkspaceContext }

export function ErpWorkspaceContent({ ws }: Props) {
  const {
    activeModule,
    currentMenuTab,
    activeRole,
    activeUser,
    activeUserId,
    superadminViewMode,
    contracts,
    settlements,
    profiles,
    cashflowScenario,
    setCashflowScenario,
    formatCurrency,
    isErpOpsAdmin,
    canViewInternalLiquidaciones,
    canViewConsolidatedLiquidaciones,
  } = ws

  const isErp = activeModule === "erp"
  const isVentas = activeModule === "ventas"

  return (
    <>
      {currentMenuTab === "Dashboard" && isErp && (
        <LazyWorkspaceTab>
          <ErpDashboardView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Usuarios" && isErp && (
        <LazyWorkspaceTab>
          <ErpUsuariosView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Cashflow" && isErp && (
        <LazyWorkspaceTab>
          <CashflowPage
            cashflowScenario={cashflowScenario}
            setCashflowScenario={setCashflowScenario}
          />
        </LazyWorkspaceTab>
      )}

      {(currentMenuTab === "Contratos" || currentMenuTab === "Mis Contratos") && isErp && (
        <LazyWorkspaceTab>
          <ContratosPage
            activeModule={activeModule}
            currentMenuTab={currentMenuTab}
            superadminViewMode={superadminViewMode}
            isErpOpsAdmin={isErpOpsAdmin}
          />
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Liquidaciones internas" && isErp && canViewInternalLiquidaciones && (
        <LazyWorkspaceTab>
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
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Liquidaciones externas" && isErp && canViewConsolidatedLiquidaciones && (
        <LazyWorkspaceTab>
          <ErpLiquidacionesExternasView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Incidencias" && isErp && (
        <LazyWorkspaceTab>
          <ErpIncidenciasView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Mi Equipo" && isErp && (
        <LazyWorkspaceTab>
          <ErpMiEquipoView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {isVentas && (
        <LazyWorkspaceTab>
          <ErpVentasTabsView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Mis Clientes" && isErp && (
        <LazyWorkspaceTab>
          <ErpMisClientesView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {(currentMenuTab === "Comparador" || currentMenuTab === "Comparador de Facturas") && isErp && (
        <LazyWorkspaceTab>
          <ErpComparadorView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {currentMenuTab === "Historial de Comparativas" && isErp && (
        <LazyWorkspaceTab>
          <ErpHistorialView ws={ws} />
        </LazyWorkspaceTab>
      )}

      {(currentMenuTab === "Tarifas" || currentMenuTab === "Marco Retributivo") && isErp && (
        <LazyWorkspaceTab>
          <ErpCatalogTabsView ws={ws} />
        </LazyWorkspaceTab>
      )}
    </>
  )
}
