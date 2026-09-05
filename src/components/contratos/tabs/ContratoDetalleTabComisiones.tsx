import { Loader2 } from "lucide-react"
import type { Contract } from "@/types/contract"
import { ContratoDetalleSection } from "@/components/contratos/contrato-detalle-ui"
import { formatContratoCanal } from "@/components/contratos/contrato-detalle-utils"
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
  const cobradorNombre = contract.nombreComercial || contract.comercialName
  const canalLabel = formatContratoCanal(contract)

  const estimate =
    entry && isActivated && consumo > 0
      ? estimateMarcoCommissionEur(entry, commissionPercentage, consumo, formatCurrency)
      : null

  const amountLabel = isActivated && estimate ? formatCurrency(estimate.amountEur) : formatCurrency(0)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-brand-subtext text-sm py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Calculando comisión…
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <ContratoDetalleSection title="Comercial que cobra">
        <div className="space-y-1">
          <p className="text-sm font-bold text-brand-text">{cobradorNombre}</p>
          <p className="text-xs text-brand-subtext">
            Canal: <span className="font-mono font-semibold text-brand-text">{canalLabel}</span>
            {comercial?.commissionPercentage != null ? (
              <>
                {" "}
                · Reparto:{" "}
                <span className="font-mono font-semibold text-brand-text">
                  {commissionPercentage}%
                </span>
              </>
            ) : null}
          </p>
        </div>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Espero a pagar">
        {!entry ? (
          <p className="text-sm text-brand-subtext italic">
            No hay marco retributivo vinculado para estimar la comisión.
          </p>
        ) : (
          <div className="rounded-xl border border-brand-border bg-brand-bg/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-brand-border/70 bg-brand-surface/50">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
                ESPERO A PAGAR
              </p>
            </div>
            <dl className="divide-y divide-brand-border/50">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-brand-text">Contrato</dt>
                <dd className="text-sm font-mono font-bold text-brand-text tabular-nums">
                  {amountLabel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3 bg-brand-panel/60">
                <dt className="text-sm font-bold text-brand-text">Total</dt>
                <dd className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {amountLabel}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {!isActivated ? (
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mt-3">
            Se calculará al activar el contrato.
          </p>
        ) : null}

        {isActivated && estimate ? (
          <p className="text-[11px] text-brand-subtext leading-relaxed mt-3">{estimate.detail}</p>
        ) : null}

        {isActivated && entry && consumo <= 0 ? (
          <p className="text-xs text-brand-subtext italic mt-3">
            Indica el consumo anual del contrato para obtener una estimación de comisión.
          </p>
        ) : null}
      </ContratoDetalleSection>
    </div>
  )
}
