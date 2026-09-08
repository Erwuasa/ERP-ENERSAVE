import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import type { Contract } from "@/types/contract"
import { useContratoMarcoRow } from "@/components/contratos/hooks/useContratoMarcoRow"
import { useContratoTarifaPrices } from "@/components/contratos/hooks/useContratoTarifaPrices"
import { ContratoTarifaMarcoCard } from "@/components/contratos/ContratoTarifaMarcoCard"
import { buildContratoTarifaMarcoView } from "@/components/contratos/contrato-tarifa-marco-view"
import { ContratoDetalleDataCard } from "@/components/contratos/contrato-detalle-ui"

interface ContratoDetalleTabTarifaMarcoProps {
  contract: Contract
  renderCompaniaLogo: (brandName: string) => ReactNode
}

export function ContratoDetalleTabTarifaMarco({
  contract,
  renderCompaniaLogo,
}: ContratoDetalleTabTarifaMarcoProps) {
  const { row, isLoading } = useContratoMarcoRow(contract)
  const catalogPrices = useContratoTarifaPrices(contract)
  const view = buildContratoTarifaMarcoView(
    catalogPrices?.length ? { ...contract, atPrices: catalogPrices } : contract,
    row
  )

  if (isLoading && !view) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand-border/80 bg-brand-panel px-4 py-8 text-sm text-brand-subtext shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando tarifa y marco…
      </div>
    )
  }

  if (!view) {
    return (
      <ContratoDetalleDataCard title="Tarifa y marco">
        <p className="text-sm italic text-brand-subtext">
          Este contrato no tiene tarifa ni marco del CRM.
        </p>
      </ContratoDetalleDataCard>
    )
  }

  return <ContratoTarifaMarcoCard view={view} renderCompaniaLogo={renderCompaniaLogo} />
}
