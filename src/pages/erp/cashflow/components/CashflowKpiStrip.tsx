import { ArrowDown, ArrowUp, RefreshCw, Wallet } from "lucide-react"
import type { CashflowKpiValues } from "@/lib/erp/cashflow-demo-data"
import { KpiCard, KpiGrid } from "@/components/common/kpi"

type Props = {
  kpi: CashflowKpiValues
  formatCurrency: (val: number) => string
}

export function CashflowKpiStrip({ kpi, formatCurrency }: Props) {
  return (
    <KpiGrid columns={4} aria-label="Indicadores de cash-flow">
      <KpiCard
        label="Por pagar"
        value={formatCurrency(kpi.porPagar)}
        hint="Colaboradores pendientes"
        tone="orange"
        icon={ArrowUp}
      />
      <KpiCard
        label="Adelanto vivo"
        value={formatCurrency(kpi.adelantoVivo)}
        hint="En contratos adelantados"
        tone="rose"
        icon={ArrowDown}
      />
      <KpiCard
        label="Pagado histórico"
        value={formatCurrency(kpi.pagadoHistorico)}
        hint="Conciliado a la fecha"
        tone="emerald"
        icon={RefreshCw}
      />
      <KpiCard
        label="Por cobrar"
        value={formatCurrency(kpi.porCobrar)}
        hint="Pendiente de comercializadoras"
        tone="blue"
        icon={Wallet}
      />
    </KpiGrid>
  )
}
