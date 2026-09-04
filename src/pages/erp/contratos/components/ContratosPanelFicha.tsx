import { X } from "lucide-react"
import type { Contract } from "@/types/contract"
import { ContractComisionDesglose } from "@/pages/erp/contratos/components/ContractComisionDesglose"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"

type Props = {
  contract: Contract
  profiles: ProfileOption[]
  formatCurrency: (val: number) => string
  onClose: () => void
}

export function ContratosPanelFicha({ contract, profiles, formatCurrency, onClose }: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-brand-border bg-brand-panel p-4 shadow-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-brand-text">
            Ficha de contrato · {contract.clientName}
          </h3>
          <p className="text-[10px] font-mono text-brand-subtext mt-1">
            {contract.cups} · {contract.compania} · {contract.tarifa}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer"
          aria-label="Cerrar ficha"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-brand-border pt-3">
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-brand-subtext font-bold mb-3">
          Desglose de comisión
        </h4>
        <ContractComisionDesglose
          contract={contract}
          profiles={profiles}
          formatCurrency={formatCurrency}
        />
      </div>
    </section>
  )
}
