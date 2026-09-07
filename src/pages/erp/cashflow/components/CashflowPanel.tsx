import { CashflowPermissionDenied } from "@/pages/erp/cashflow/components/CashflowPermissionDenied"
import type { CashflowScenario } from "@/lib/erp/cashflow-demo-data"
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

/** Pantalla oculta: sin acceso para ningún rol (incluido superadmin). */
export function CashflowPanel(_props: CashflowPanelProps) {
  return <CashflowPermissionDenied />
}
