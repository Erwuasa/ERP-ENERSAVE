import { Loader2 } from "lucide-react"
import type { Contract } from "@/types/contract"
import {
  ContratoDetalleDataCard,
} from "@/components/contratos/contrato-detalle-ui"
import {
  resolveContratoComercialDisplayName,
  resolveContratoComercialRoleLabel,
} from "@/components/contratos/contrato-detalle-utils"
import { useContratoMarcoRow } from "@/components/contratos/hooks/useContratoMarcoRow"
import { isContractActivado } from "@/lib/contract-estado"
import { estimateMarcoCommissionEur } from "@/lib/marco-commission"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"

interface ContratoDetalleTabComisionesProps {
  contract: Contract
  profiles: ProfileOption[]
  formatCurrency: (val: number) => string
}

export function ContratoDetalleTabComisiones({
  contract,
  profiles,
  formatCurrency,
}: ContratoDetalleTabComisionesProps) {
  const { entry, isLoading } = useContratoMarcoRow(contract)
  const comercial = profiles.find((p) => p.id === contract.comercialId)
  const commissionPercentage = comercial?.commissionPercentage ?? 70
  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
  const isActivated = isContractActivado(contract.estado)
  const cobradorNombre = resolveContratoComercialDisplayName(contract, profiles)
  const cobradorRol = resolveContratoComercialRoleLabel(contract, profiles)

  const estimate =
    entry && isActivated
      ? estimateMarcoCommissionEur(entry, commissionPercentage, consumo, formatCurrency)
      : null

  const amountLabel = formatCurrency(estimate?.amountEur ?? 0)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-brand-subtext">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculando comisión…
      </div>
    )
  }

  return (
    <ContratoDetalleDataCard title="Comisiones">
      <div className="space-y-1">
        <p className="text-sm font-bold text-brand-text">{cobradorNombre}</p>
        {cobradorRol ? (
          <p className="text-xs font-medium text-brand-subtext">{cobradorRol}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-brand-border/80 bg-brand-bg/30">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold text-brand-text">Contrato</span>
          <span className="font-mono text-sm font-bold tabular-nums text-brand-text">
            {amountLabel}
          </span>
        </div>
      </div>

      {!entry ? (
        <p className="text-xs italic text-brand-subtext">
          Sin marco retributivo vinculado; la comisión se muestra a 0 €.
        </p>
      ) : null}

      {!isActivated ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Se calculará al activar el contrato.
        </p>
      ) : null}

      {isActivated && estimate?.detail ? (
        <p className="text-[11px] leading-relaxed text-brand-subtext">{estimate.detail}</p>
      ) : null}
    </ContratoDetalleDataCard>
  )
}
