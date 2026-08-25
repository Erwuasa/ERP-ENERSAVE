import { ContratosPanel } from "@/pages/erp/contratos/components/ContratosPanel"
import { useContratosPage } from "@/pages/erp/contratos/hooks/useContratosPage"

export interface ContratosPageProps {
  activeModule: "erp" | "ventas"
  currentMenuTab: string
  superadminViewMode: "tramitacion" | "comercial"
  isErpOpsAdmin: boolean
}

export function ContratosPage({
  activeModule,
  currentMenuTab,
  superadminViewMode,
  isErpOpsAdmin,
}: ContratosPageProps) {
  const { panelProps } = useContratosPage({
    activeModule,
    currentMenuTab,
    superadminViewMode,
    isErpOpsAdmin,
  })

  return <ContratosPanel {...panelProps} />
}
