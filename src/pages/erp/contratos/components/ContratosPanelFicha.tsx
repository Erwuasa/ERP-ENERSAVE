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

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-brand-border pt-3 space-y-4">
        {(contract.atStatusNote || (contract.atNotes && contract.atNotes.length > 0)) && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-brand-subtext font-bold">
              Incidencia / notas AT
            </h4>
            {contract.atStatusNote && (
              <p className="text-xs text-brand-text leading-relaxed">{contract.atStatusNote}</p>
            )}
            {contract.atIncidentAt && (
              <p className="text-[10px] font-mono text-brand-subtext">{contract.atIncidentAt}</p>
            )}
            {contract.atNotes && contract.atNotes.length > 0 && (
              <ul className="space-y-1.5">
                {contract.atNotes.slice(0, 8).map((note, index) => (
                  <li
                    key={note.id ?? `${note.createdAt ?? "note"}-${index}`}
                    className="rounded-lg border border-brand-border/70 px-2.5 py-2 text-[11px] text-brand-text"
                  >
                    <p className="leading-snug">{note.note || "—"}</p>
                    {(note.createdAt || note.authorSide) && (
                      <p className="mt-1 text-[10px] font-mono text-brand-subtext">
                        {[note.authorSide, note.createdAt].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <h4 className="text-[10px] font-mono uppercase tracking-wider text-brand-subtext font-bold mb-3">
            Desglose de comisión
          </h4>
          <ContractComisionDesglose
            contract={contract}
            profiles={profiles}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </section>
  )
}
