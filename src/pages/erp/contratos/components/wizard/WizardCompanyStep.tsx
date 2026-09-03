import { useMemo, useState } from "react"
import { ArrowRight, Flame, Lightbulb, Search } from "lucide-react"
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
  featuredCompanies: string[]
  atRestCompanies: string[]
  companySupplyTypes: Record<string, Array<"luz" | "gas">>
  setSegment: (next: ContractWizardSegment) => void
  setTipo: (next: "luz" | "gas") => void
  selectCompany: (compania: string) => void
  goToTab: (tab: "cliente") => void
  onClose: () => void
}

function CompanyCard({
  compania,
  selected,
  tipos,
  onSelect,
}: {
  compania: string
  selected: boolean
  tipos: Array<"luz" | "gas">
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center justify-center gap-2.5 p-4 ${radius["2xl"]} border transition-all min-h-[112px] cursor-pointer ${
        selected
          ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30"
          : "border-brand-border bg-brand-surface hover:border-cyan-500/50 hover:bg-cyan-500/5"
      }`}
    >
      <CompaniaLogo name={compania} size="md" />
      <span className="text-[11px] font-semibold text-brand-text text-center leading-tight line-clamp-2">
        {formatCompaniaLabel(compania)}
      </span>
      {tipos.length > 0 ? (
        <span className="flex flex-wrap items-center justify-center gap-1">
          {tipos.map((tipo) => (
            <span
              key={tipo}
              className={`px-1.5 py-0.5 rounded text-[8px] ${fonts.mono} font-bold uppercase ${
                tipo === "luz"
                  ? "bg-amber-400/15 text-amber-700 dark:text-amber-200"
                  : "bg-orange-400/15 text-orange-700 dark:text-orange-200"
              }`}
            >
              {tipo}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  )
}

export function WizardCompanyStep({
  form,
  segment,
  featuredCompanies,
  atRestCompanies,
  companySupplyTypes,
  setSegment,
  setTipo,
  selectCompany,
  goToTab,
  onClose,
}: Props) {
  const [query, setQuery] = useState("")
  const featuredVisible = useMemo(
    () => filterAndSortWizardCompanies(featuredCompanies, query),
    [featuredCompanies, query]
  )
  const atVisible = useMemo(
    () => filterAndSortWizardCompanies(atRestCompanies, query),
    [atRestCompanies, query]
  )
  const total = featuredCompanies.length + atRestCompanies.length
  const tipoLabel = form.tipo === "gas" ? "gas" : "luz"
  const segmentLabel = segment === "pyme" ? "PYME" : "residencial"

  return (
    <div className="p-6 overflow-y-auto flex-1 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
          <span className="hidden sm:inline-block w-px self-stretch bg-brand-border mx-1" />
          {(["luz", "gas"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] ${fonts.mono} font-bold uppercase ${radius.lg} border transition-all cursor-pointer ${
                form.tipo === t
                  ? t === "luz"
                    ? "bg-amber-300/25 border-amber-400/55 text-amber-800 dark:text-amber-200"
                    : "bg-orange-400/20 border-orange-400/50 text-orange-800 dark:text-orange-200"
                  : "bg-brand-surface border-brand-border text-brand-subtext"
              }`}
            >
              {t === "luz" ? <Lightbulb className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-subtext" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar comercializadora (${total})`}
            aria-label="Buscar comercializadora"
            className={`${WIZARD_INPUT_CLASS} pl-9`}
          />
        </label>
      </div>

      {featuredVisible.length === 0 && atVisible.length === 0 ? (
        <p className={`py-10 text-center text-xs ${fonts.mono} text-brand-subtext`}>
          {query.trim()
            ? `Ninguna comercializadora coincide con “${query.trim()}”.`
            : `No hay comercializadoras de ${tipoLabel} ${segmentLabel}.`}
        </p>
      ) : (
        <div className="space-y-6">
          {featuredVisible.length > 0 ? (
            <section className="space-y-2">
              <h3 className={`text-[10px] ${fonts.mono} font-bold uppercase text-brand-subtext`}>
                {tipoLabel} · {segmentLabel}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {featuredVisible.map((compania) => (
                  <CompanyCard
                    key={compania}
                    compania={compania}
                    selected={form.compania === compania}
                    tipos={companySupplyTypes[compania] ?? []}
                    onSelect={() => selectCompany(compania)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {atVisible.length > 0 ? (
            <section className="space-y-2">
              <h3 className={`text-[10px] ${fonts.mono} font-bold uppercase text-brand-subtext`}>
                Catálogo AT
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {atVisible.map((compania) => (
                  <CompanyCard
                    key={compania}
                    compania={compania}
                    selected={form.compania === compania}
                    tipos={[]}
                    onSelect={() => selectCompany(compania)}
                  />
                ))}
              </div>
            </section>
          ) : null}
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
