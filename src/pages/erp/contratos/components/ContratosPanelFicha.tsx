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
    <section className="bg-brand-panel border border-brand-border rounded-2xl p-5 space-y-4">
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

      <div className="border-t border-brand-border pt-4">
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
