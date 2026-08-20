import { ArrowDown, ArrowUp, RefreshCw, Wallet } from "lucide-react"
import type { CashflowKpiValues } from "@/lib/erp/cashflow-demo-data"
import { CashflowKpiCard } from "@/pages/erp/cashflow/components/CashflowKpiCard"

type Props = {
  kpi: CashflowKpiValues
  formatCurrency: (val: number) => string
}

export function CashflowKpiStrip({ kpi, formatCurrency }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <CashflowKpiCard
        title="POR PAGAR"
        value={formatCurrency(kpi.porPagar)}
        subtitle="colaboradores pendientes"
        borderClass="border-orange-200 dark:border-orange-500/30"
        icon={
          <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <ArrowUp className="w-5 h-5" />
          </span>
        }
      />
      <CashflowKpiCard
        title="ADELANTO VIVO"
        value={formatCurrency(kpi.adelantoVivo)}
        subtitle="en contratos adelantados"
        badge="CASH-FLOW"
        borderClass="border-red-200 dark:border-red-500/30"
        icon={
          <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
            <ArrowDown className="w-5 h-5" />
          </span>
        }
      />
      <CashflowKpiCard
        title="PAGADO HISTÓRICO"
        value={formatCurrency(kpi.pagadoHistorico)}
        subtitle="conciliado a la fecha"
        borderClass="border-emerald-200 dark:border-emerald-500/30"
        icon={
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <RefreshCw className="w-5 h-5" />
          </span>
        }
      />
      <CashflowKpiCard
        title="POR COBRAR (COMERCIAL.)"
        value={formatCurrency(kpi.porCobrar)}
        subtitle="pendiente de comercializadoras"
        borderClass="border-blue-200 dark:border-blue-500/30"
        icon={
          <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <Wallet className="w-5 h-5" />
          </span>
        }
      />
    </div>
  )
}
