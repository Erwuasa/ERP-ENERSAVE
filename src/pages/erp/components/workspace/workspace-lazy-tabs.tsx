import { Suspense, lazy, type ReactNode } from "react"

const ErpDashboardView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpDashboardView").then((m) => ({
    default: m.ErpDashboardView,
  }))
)
const ErpUsuariosView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpUsuariosView").then((m) => ({
    default: m.ErpUsuariosView,
  }))
)
const ErpLiquidacionesExternasView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpLiquidacionesExternasView").then((m) => ({
    default: m.ErpLiquidacionesExternasView,
  }))
)
const ErpMiEquipoView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpMiEquipoView").then((m) => ({
    default: m.ErpMiEquipoView,
  }))
)
const ErpComparadorView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpComparadorView").then((m) => ({
    default: m.ErpComparadorView,
  }))
)
const ErpHistorialView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpHistorialView").then((m) => ({
    default: m.ErpHistorialView,
  }))
)
const ErpIncidenciasView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpIncidenciasView").then((m) => ({
    default: m.ErpIncidenciasView,
  }))
)
const ErpVentasTabsView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpVentasTabsView").then((m) => ({
    default: m.ErpVentasTabsView,
  }))
)
const ErpMisClientesView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpMisClientesView").then((m) => ({
    default: m.ErpMisClientesView,
  }))
)
const ErpCatalogTabsView = lazy(() =>
  import("@/pages/erp/components/workspace/views/ErpCatalogTabsView").then((m) => ({
    default: m.ErpCatalogTabsView,
  }))
)
const ContratosPage = lazy(() =>
  import("@/pages/erp/contratos/ContratosPage").then((m) => ({
    default: m.ContratosPage,
  }))
)
const LiquidacionesInternasPanel = lazy(() =>
  import("@/components/LiquidacionesInternasPanel").then((m) => ({
    default: m.LiquidacionesInternasPanel,
  }))
)
const CashflowPage = lazy(() =>
  import("@/pages/erp/cashflow/CashflowPage").then((m) => ({
    default: m.CashflowPage,
  }))
)

function WorkspaceTabFallback() {
  return (
    <div className="flex items-center justify-center min-h-[240px]">
      <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function LazyWorkspaceTab({ children }: { children: ReactNode }) {
  return <Suspense fallback={<WorkspaceTabFallback />}>{children}</Suspense>
}

export {
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
}
