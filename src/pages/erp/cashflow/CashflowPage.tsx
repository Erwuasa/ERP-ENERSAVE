import { CashflowPanel } from "@/pages/erp/cashflow/components/CashflowPanel"
import type { CashflowScenario } from "@/lib/erp/cashflow-demo-data"
import { formatCurrency } from "@/lib/erp/format-currency"
import { useAuth } from "@/hooks/useAuth"

export interface CashflowPageProps {
  cashflowScenario: CashflowScenario
  setCashflowScenario: (val: CashflowScenario) => void
}

export function CashflowPage({ cashflowScenario, setCashflowScenario }: CashflowPageProps) {
  const { activeUser } = useAuth()

  return (
    <CashflowPanel
      activeRole={activeUser.role}
      formatCurrency={formatCurrency}
      cashflowScenario={cashflowScenario}
      setCashflowScenario={setCashflowScenario}
    />
  )
}
