import { Download, Star } from "lucide-react"
import type { ReactNode } from "react"

export interface ComparadorOfferOption {
  id: string
  companyName: string
  tariffName: string
  monthlyCost: number
  annualCost: number
  potenciaBreakdown: number
  consumoBreakdown: number
  savingsAnnual: number
  isBestOption?: boolean
}

interface ComparadorOfferCardProps {
  option: ComparadorOfferOption
  segment: "residencial" | "pyme"
  renderCompaniaLogo: (brandName: string) => ReactNode
  onContract: () => void
  onDownloadPdf: () => void
}

function inferPricingLabel(tariffName: string): "Fijo" | "Indexado" {
  const name = tariffName.toLowerCase()
  if (
    name.includes("index") ||
    name.includes("variable") ||
    name.includes("pool") ||
    name.includes("uso")
  ) {
    return "Indexado"
  }
  return "Fijo"
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function savingsTone(savingsAnnual: number): "positive" | "neutral" | "negative" {
  if (savingsAnnual > 0) return "positive"
  if (savingsAnnual < 0) return "negative"
  return "neutral"
}

export function ComparadorOfferCard({
  option,
  segment,
  renderCompaniaLogo,
  onContract,
  onDownloadPdf,
}: ComparadorOfferCardProps) {
  const potenciaMonthly = option.potenciaBreakdown / 12
  const energiaMonthly = option.consumoBreakdown / 12
  const ahorroMonthly = option.savingsAnnual / 12
  const pricingLabel = inferPricingLabel(option.tariffName)
  const tone = savingsTone(option.savingsAnnual)

  const totalClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-brand-text"

  const savingsClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-brand-text"

  return (
    <article
      className={`relative rounded-2xl border bg-brand-panel p-5 shadow-sm transition-colors ${
        option.isBestOption
          ? "border-blue-500/30 ring-1 ring-blue-500/10"
          : "border-brand-border"
      }`}
    >
      <button
        type="button"
        onClick={onDownloadPdf}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors cursor-pointer"
        aria-label={`Descargar estudio PDF de ${option.companyName}`}
        title="Descargar PDF"
      >
        <Download className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-10">
        <div className="shrink-0 pt-0.5">{renderCompaniaLogo(option.companyName)}</div>
        <h3 className="text-sm font-bold text-brand-text leading-snug tracking-tight flex items-center gap-1.5 flex-wrap">
          <span>{option.tariffName}</span>
          {option.isBestOption ? (
            <span
              className="inline-flex items-center gap-0.5 text-amber-500"
              title="Top ahorro"
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden />
              <span className="sr-only">Top ahorro</span>
            </span>
          ) : null}
        </h3>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          {segment === "pyme" ? "Empresa" : "Residencial"}
        </span>
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-surface text-brand-subtext border border-brand-border">
          {pricingLabel}
        </span>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-brand-subtext">Potencia</span>
          <span className="font-mono font-semibold text-brand-text tabular-nums">
            {formatEuro(potenciaMonthly)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-brand-subtext">Energía</span>
          <span className="font-mono font-semibold text-brand-text tabular-nums">
            {formatEuro(energiaMonthly)}
          </span>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-brand-border">
        <div className="flex items-end justify-between gap-4">
          <span className="text-sm font-semibold text-brand-text">Total</span>
          <span
            className={`text-2xl font-extrabold font-mono tabular-nums leading-none ${totalClass}`}
          >
            {formatEuro(option.monthlyCost)}
          </span>
        </div>
        <p className={`mt-2 text-sm font-semibold ${savingsClass}`}>
          {tone === "negative"
            ? `Ahorra ${formatEuro(ahorroMonthly)}`
            : tone === "positive"
              ? `Ahorra ${formatEuro(ahorroMonthly)}`
              : `Ahorra ${formatEuro(0)}`}
        </p>
      </div>

      <button
        type="button"
        onClick={onContract}
        className="mt-5 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors cursor-pointer"
      >
        Contratar
      </button>
    </article>
  )
}
