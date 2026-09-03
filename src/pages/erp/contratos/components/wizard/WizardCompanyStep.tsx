import { useMemo, useState } from "react"
import { ArrowRight, Search } from "lucide-react"
import { fonts, radius } from "@/constants/styles"
import {
  filterAndSortWizardCompanies,
  formatCompaniaLabel,
} from "@/lib/erp/compania-logos"
import { CompaniaLogo } from "@/lib/erp/render-compania-logo"
import type { ContractWizardSegment } from "@/lib/contract-tariff-filter"
import type { NewContractFormState } from "@/lib/contract-registration"
import { WIZARD_INPUT_CLASS } from "@/pages/erp/contratos/components/wizard/wizard-ui"

type Props = {
  form: NewContractFormState
  segment: ContractWizardSegment
  companies: string[]
  setSegment: (next: ContractWizardSegment) => void
  selectCompany: (compania: string) => void
  goToTab: (tab: "cliente") => void
  onClose: () => void
}

export function WizardCompanyStep({
  form,
  segment,
  companies,
  setSegment,
  selectCompany,
  goToTab,
  onClose,
}: Props) {
  const [query, setQuery] = useState("")
  const visibleCompanies = useMemo(
    () => filterAndSortWizardCompanies(companies, query),
    [companies, query]
  )

  return (
    <div className="p-6 overflow-y-auto flex-1 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["residencial", "pyme"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={`px-4 py-2 text-[10px] ${fonts.mono} font-bold uppercase ${radius.lg} border transition-all cursor-pointer ${
                segment === s
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-brand-surface border-brand-border text-brand-text"
              }`}
            >
              {s === "residencial" ? "Residencial" : "PYME"}
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-subtext" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar comercializadora (${companies.length})`}
            className={`${WIZARD_INPUT_CLASS} pl-9`}
          />
        </label>
      </div>

      {visibleCompanies.length === 0 ? (
        <p className={`py-10 text-center text-xs ${fonts.mono} text-brand-subtext`}>
          Ninguna comercializadora coincide con “{query.trim()}”.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visibleCompanies.map((compania) => {
            const isSelected = form.compania === compania
            const label = formatCompaniaLabel(compania)
            return (
              <button
                key={compania}
                type="button"
                onClick={() => selectCompany(compania)}
                className={`flex flex-col items-center justify-center gap-3 p-4 ${radius["2xl"]} border transition-all min-h-[112px] cursor-pointer ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30"
                    : "border-brand-border bg-brand-surface hover:border-cyan-500/50 hover:bg-cyan-500/5"
                }`}
              >
                <CompaniaLogo name={compania} size="md" />
                <span className="text-[11px] font-semibold text-brand-text text-center leading-tight line-clamp-2">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      )}

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
