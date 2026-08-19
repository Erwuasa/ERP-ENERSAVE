import { ContratosPanel } from "@/pages/erp/contratos/components/ContratosPanel"
import {
  useContratosPage,
  type ContratosPageActions,
} from "@/pages/erp/contratos/hooks/useContratosPage"

export interface ContratosPageProps {
  activeModule: "erp" | "ventas"
  currentMenuTab: string
  superadminViewMode: "tramitacion" | "comercial"
  isErpOpsAdmin: boolean
  actions: ContratosPageActions
}

export function ContratosPage({
  activeModule,
  currentMenuTab,
  superadminViewMode,
  isErpOpsAdmin,
  actions,
}: ContratosPageProps) {
  const { panelProps } = useContratosPage({
    activeModule,
    currentMenuTab,
    superadminViewMode,
    isErpOpsAdmin,
    actions,
  })

  return <ContratosPanel {...panelProps} />
}
