import type { ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import { MarcoRetributivoPanel } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoPanel"
import { renderCompaniaLogo } from "@/lib/erp/render-compania-logo"
import { formatCurrency } from "@/lib/erp/format-currency"

export function MarcoRetributivoPage() {
  const { activeUserId, activeUser } = useAuth()

  return (
    <MarcoRetributivoPanel
      activeRole={
        activeUser.role as "superadmin" | "tramitacion" | "jefe_comercial" | "comercial"
      }
      activeUserId={activeUserId}
      commissionPercentage={activeUser.commissionPercentage}
      formatCurrency={formatCurrency}
      renderCompaniaLogo={renderCompaniaLogo as (brandName: string) => ReactNode}
    />
  )
}
