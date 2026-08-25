import { SensitiveScreenShell } from "@/components/SensitiveScreenShell"
import { CashflowPanel } from "@/pages/erp/cashflow/components/CashflowPanel"
import type { CashflowScenario } from "@/lib/erp/cashflow-demo-data"
import { formatCurrency } from "@/lib/erp/format-currency"
import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"

export interface CashflowPageProps {
  cashflowScenario: CashflowScenario
  setCashflowScenario: (val: CashflowScenario) => void
}

export function CashflowPage({ cashflowScenario, setCashflowScenario }: CashflowPageProps) {
  const { activeUser } = useAuth()
  const { contracts, settlements } = useErpData()

  return (
    <SensitiveScreenShell userLabel={activeUser.fullName}>
      <CashflowPanel
        activeRole={activeUser.role}
        formatCurrency={formatCurrency}
        cashflowScenario={cashflowScenario}
        setCashflowScenario={setCashflowScenario}
        contracts={contracts}
        settlements={settlements}
      />
    </SensitiveScreenShell>
  )
}
