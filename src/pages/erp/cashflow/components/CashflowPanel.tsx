import { Download } from "lucide-react"
import { toast } from "sonner"
import type { CashflowScenario } from "@/lib/erp/cashflow-demo-data"
import { useCashflowPanel } from "@/pages/erp/cashflow/hooks/useCashflowPanel"
import { CashflowPermissionDenied } from "@/pages/erp/cashflow/components/CashflowPermissionDenied"
import { CashflowKpiStrip } from "@/pages/erp/cashflow/components/CashflowKpiStrip"
import { CashflowProjectionSection } from "@/pages/erp/cashflow/components/CashflowProjectionSection"
import { CashflowCanalSections } from "@/pages/erp/cashflow/components/CashflowCanalSections"

export interface CashflowPanelProps {
  activeRole: string
  formatCurrency: (val: number) => string
  cashflowScenario: CashflowScenario
  setCashflowScenario: (val: CashflowScenario) => void
}

export function CashflowPanel({
  activeRole,
  formatCurrency,
  cashflowScenario,
  setCashflowScenario,
}: CashflowPanelProps) {
  const vm = useCashflowPanel(cashflowScenario)

  if (activeRole !== "superadmin") {
    return <CashflowPermissionDenied />
  }

  return (
    <div className="space-y-6 animate-fade-in text-brand-text font-sans">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            toast.success("Proyecciones de tesorería exportadas a formato Excel (.xlsx)")
          }
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
