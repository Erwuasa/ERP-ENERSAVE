import { Download } from "lucide-react"
import { toast } from "sonner"
import type { CashflowScenario } from "@/lib/erp/cashflow-demo-data"
import { useCashflowPanel } from "@/pages/erp/cashflow/hooks/useCashflowPanel"
import { CashflowPermissionDenied } from "@/pages/erp/cashflow/components/CashflowPermissionDenied"
import { CashflowKpiStrip } from "@/pages/erp/cashflow/components/CashflowKpiStrip"
import { CashflowProjectionSection } from "@/pages/erp/cashflow/components/CashflowProjectionSection"
import { CashflowCanalSections } from "@/pages/erp/cashflow/components/CashflowCanalSections"
import { exportCashflowForecastToExcel } from "@/lib/cashflow-forecast-export"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"

export interface CashflowPanelProps {
  activeRole: string
  formatCurrency: (val: number) => string
  cashflowScenario: CashflowScenario
  setCashflowScenario: (val: CashflowScenario) => void
  contracts?: Contract[]
  settlements?: Settlement[]
}

export function CashflowPanel({
  activeRole,
  formatCurrency,
  cashflowScenario,
  setCashflowScenario,
  contracts = [],
  settlements = [],
}: CashflowPanelProps) {
  const vm = useCashflowPanel(cashflowScenario, contracts, settlements)

  if (activeRole !== "superadmin") {
    return <CashflowPermissionDenied />
  }

  return (
    <div className="space-y-6 animate-fade-in text-brand-text font-sans">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            exportCashflowForecastToExcel(vm.semanasCashflow)
            toast.success("Proyecciones de tesorería exportadas a formato Excel (.xlsx)")
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-brand-surface hover:bg-slate-50 dark:hover:bg-brand-panel text-brand-text border border-brand-border rounded-xl text-xs font-semibold font-mono tracking-tight cursor-pointer transition-all shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Reporte</span>
        </button>
      </div>

      <CashflowKpiStrip kpi={vm.kpi} formatCurrency={formatCurrency} />

      <CashflowProjectionSection
        open={vm.projectionOpen}
        onToggle={() => vm.setProjectionOpen((open) => !open)}
        cashflowScenario={cashflowScenario}
        setCashflowScenario={setCashflowScenario}
        kpi={vm.kpi}
        formatCurrency={formatCurrency}
      />

      <CashflowCanalSections
        canalSearch={vm.canalSearch}
        setCanalSearch={vm.setCanalSearch}
        filteredPendientes={vm.filteredPendientes}
        filteredLiquidaciones={vm.filteredLiquidaciones}
        selectedContraparte={vm.selectedContraparte}
        setSelectedContraparte={vm.setSelectedContraparte}
        formatCurrency={formatCurrency}
      />
    </div>
  )
}
