import { FilePenLine, X } from "lucide-react"
import type { Client } from "@/types/client"
import type { Contract } from "@/types/contract"

type Props = {
  client: Client
  contracts: Contract[]
  onClose: () => void
  onSelectContract: (contract: Contract) => void
}

export function ClientesContractsModal({
  client,
  contracts,
  onClose,
  onSelectContract,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-brand-border flex justify-between items-start">
          <div>
            <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide flex items-center gap-2">
              <FilePenLine className="w-4 h-4 text-cyan-500" />
              Contratos asociados
            </h3>
            <p className="text-[10px] text-brand-subtext mt-1">{client.nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-brand-text cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {contracts.length === 0 ? (
            <p className="text-xs text-brand-subtext text-center py-6">
              Este cliente no tiene contratos registrados todavía.
            </p>
          ) : (
            contracts.map((contract) => (
              <button
                key={contract.id}
                type="button"
                onClick={() => onSelectContract(contract)}
                className="w-full text-left p-3 rounded-xl border border-brand-border hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start gap-2">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      contract.tipo === "luz"
                        ? "bg-cyan-500/10 text-cyan-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {contract.tipo}
                  </span>
                  <span className="text-[9px] font-mono text-brand-subtext uppercase">
                    {contract.estado}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-1.5">
                  {contract.cups}
                </p>
                <p className="text-xs text-brand-text mt-0.5">
                  {contract.compania} · {contract.tarifa}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
