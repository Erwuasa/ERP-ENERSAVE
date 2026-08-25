import { ArrowRight } from "lucide-react"
import type { ContractWizardSegment } from "@/lib/contract-tariff-filter"
import type { NewContractFormState } from "@/lib/contract-registration"
import type { ReactNode } from "react"

type Props = {
  form: NewContractFormState
  segment: ContractWizardSegment
  companies: string[]
  renderCompaniaLogo: (brandName: string) => ReactNode
  setSegment: (next: ContractWizardSegment) => void
  selectCompany: (compania: string) => void
  goToTab: (tab: "cliente") => void
  onClose: () => void
}

export function WizardCompanyStep({
  form,
  segment,
  companies,
  renderCompaniaLogo,
  setSegment,
  selectCompany,
  goToTab,
  onClose,
}: Props) {
  return (
    <div className="p-6 overflow-y-auto flex-1 space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["residencial", "pyme"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSegment(s)}
            className={`px-4 py-2 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all cursor-pointer ${
              segment === s
                ? "bg-cyan-600 text-white border-cyan-600"
                : "bg-brand-surface border-brand-border text-brand-text"
            }`}
          >
            {s === "residencial" ? "Residencial" : "PYME"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {companies.map((compania) => {
          const isSelected = form.compania === compania
          return (
            <button
              key={compania}
              type="button"
              onClick={() => selectCompany(compania)}
              className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all min-h-[120px] cursor-pointer ${
                isSelected
                  ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30"
                  : "border-brand-border bg-brand-surface hover:border-cyan-500/50 hover:bg-cyan-500/5"
              }`}
            >
              <div className="scale-125">{renderCompaniaLogo(compania)}</div>
              <span className="text-[10px] font-mono font-bold text-brand-subtext uppercase">
                {compania}
              </span>
            </button>
          )
        })}
      </div>
      <div className="pt-2 border-t border-brand-border flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-bold text-brand-subtext hover:text-brand-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!form.compania}
          onClick={() => goToTab("cliente")}
          className="flex-1 py-2.5 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 disabled:opacity-40 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
