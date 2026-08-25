import { useMemo } from "react"
import type { Contract } from "@/types/contract"
import { computeComisionBreakdown } from "@/lib/marco-commission"
import { resolveMarcoCatalogEntry } from "@/lib/supabase/marco-retributivo"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"

export interface ContractComisionDesgloseProps {
  contract: Contract
  profiles: ProfileOption[]
  formatCurrency: (val: number) => string
}

export function ContractComisionDesglose({
  contract,
  profiles,
  formatCurrency,
}: ContractComisionDesgloseProps) {
  const comercial = profiles.find((p) => p.id === contract.comercialId)
  const commissionPercentage = comercial?.commissionPercentage ?? 70
  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0

  const breakdown = useMemo(() => {
    const entry = resolveMarcoCatalogEntry(
      contract.marcoEntryId,
      contract.compania,
      contract.tarifa,
      contract.tipo
    )
    if (!entry || !consumo || consumo <= 0) return null
    return computeComisionBreakdown(entry, commissionPercentage, consumo, formatCurrency)
  }, [contract, commissionPercentage, consumo, formatCurrency])

  if (!breakdown) {
    return (
      <p className="text-xs text-brand-subtext italic">
        No hay marco retributivo vinculado o consumo insuficiente para calcular la comisión.
      </p>
    )
  }

  return (
    <div className="space-y-2 text-xs">
      <p className="text-brand-text">
        <span className="font-semibold">{contract.compania}</span> paga a ENerSave:{" "}
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(breakdown.comisionEmpresa)}
        </span>
      </p>
      <p className="text-brand-text">
        Comercial <span className="font-semibold">{contract.comercialName}</span> cobra (
        {commissionPercentage}%):{" "}
        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
          {formatCurrency(breakdown.comisionComercial)}
        </span>
      </p>
      <p className="text-[10px] text-brand-subtext leading-relaxed">{breakdown.detalle}</p>
    </div>
  )
}
