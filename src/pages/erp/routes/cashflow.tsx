import { CashflowPage } from "@/pages/erp/cashflow/CashflowPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpCashflowRoute() {
  const { cashflowScenario, setCashflowScenario } = useErpWorkspaceContext()
  return (
    <CashflowPage
      cashflowScenario={cashflowScenario}
      setCashflowScenario={setCashflowScenario}
    />
  )
}
