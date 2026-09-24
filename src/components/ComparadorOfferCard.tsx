import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, Bookmark, BookmarkCheck, Download, Mail, Star } from "lucide-react"
import type { ReactNode } from "react"
import type { ComparadorSortMode } from "../lib/comparador-sort"
import type { ComparadorTariffPricingType } from "../lib/comparador-tariff-pricing-type"
import { resolveComparadorTariffPricingType } from "../lib/comparador-tariff-pricing-type"
import { resolveCompaniaLogoKey } from "../lib/erp/compania-logos"
import {
  breakdownAmountTone,
  type ComparadorOfferBreakdownRow,
} from "../lib/comparador-offer-breakdown"
import type { TariffPreciosPorPeriodo } from "../lib/tarifa-cost-calculator"
import { roundComparadorMoney } from "../lib/comparador-billing"

export interface ComparadorOfferOption {
  id: string
  companyName: string
  tariffName: string
  companyLogoUrl?: string | null
  pricingType?: ComparadorTariffPricingType
  monthlyCost: number
  annualCost: number
  /** Base imponible mensual (sin IEE/IVA), coherente con monthlyCost. */
  monthlyBaseImponible?: number
  monthlyIee?: number
  monthlyIva?: number
  potenciaBreakdown: number
  consumoBreakdown: number
  savingsAnnual: number
  savingsPercentage?: number
  commissionEur?: number
  commissionPrecision?: "exacto" | "estimado" | "sin_datos" | "sin_consumo"
  commissionTramoLabel?: string
  showCommission?: boolean
  isBestOption?: boolean
  breakdownRows?: ComparadorOfferBreakdownRow[]
  precios?: TariffPreciosPorPeriodo
}

interface ComparadorOfferCardProps {
  option: ComparadorOfferOption
  segment: "residencial" | "pyme"
  sortMode?: ComparadorSortMode
  savedToHistory?: boolean
  renderCompaniaLogo: (brandName: string, logoUrl?: string | null) => ReactNode
  onContract: () => void
  onDownloadPdf: () => void
  onSaveToHistory?: () => void
  onSendEmail?: () => void
  sendingEmail?: boolean
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

function toneClass(tone: "positive" | "neutral" | "negative", bold = false): string {
  const weight = bold ? "font-bold" : "font-semibold"
  if (tone === "positive") return `${weight} text-emerald-600 dark:text-emerald-400`
  if (tone === "negative") return `${weight} text-rose-600 dark:text-rose-400`
  return `${weight} text-brand-text`
}

function BreakdownRow({ row }: { row: ComparadorOfferBreakdownRow }) {
  const tone = breakdownAmountTone(row.savings)
  const isTotal = row.kind === "total"

  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-3 items-start py-2 ${
        isTotal ? "border-t border-brand-border pt-3 mt-1" : "border-b border-brand-border/50 last:border-0"
      }`}
    >
      <p className={`text-xs leading-snug ${isTotal ? "font-bold text-brand-text" : "text-brand-subtext"}`}>
        {row.labelLeft}
      </p>
      <div className="text-right min-w-[5.5rem]">
        <p className={`text-xs font-mono tabular-nums ${toneClass(tone, isTotal)}`}>
          {formatEuro(row.amountOffer)}
        </p>
        {row.savings != null && row.savings !== 0 && !isTotal ? (
          <p className={`text-[10px] font-mono tabular-nums mt-0.5 ${toneClass(tone)}`}>
            {row.savings > 0 ? "−" : "+"}
            {formatEuro(Math.abs(row.savings))}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function ComparadorOfferCard({
  option,
  segment,
  sortMode = "ahorro",
  savedToHistory = false,
  renderCompaniaLogo,
  onContract,
  onDownloadPdf,
  onSaveToHistory,
  onSendEmail,
  sendingEmail = false,
}: ComparadorOfferCardProps) {
  const [desgloseOpen, setDesgloseOpen] = useState(false)
  const bestLabel = sortMode === "comision" ? "Top comisión" : "Top ahorro"
  const potenciaMonthly = roundComparadorMoney(option.potenciaBreakdown / 12)
  const energiaMonthly = roundComparadorMoney(option.consumoBreakdown / 12)
  const ahorroMonthly = roundComparadorMoney(option.savingsAnnual / 12)
  const pricingLabel =
    option.pricingType ??
    resolveComparadorTariffPricingType({
      name: option.tariffName,
      isIndexed: false,
    })
  const pricingLabelText = pricingLabel === "indexado" ? "Indexado" : "Fijo"
  const tone = savingsTone(option.savingsAnnual)
  const savingsPct = Math.abs(option.savingsPercentage ?? 0)
  const breakdownRows = option.breakdownRows ?? []
  const hasBundledLogo = Boolean(resolveCompaniaLogoKey(option.companyName))

  const totalClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
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
      <div className="absolute top-4 right-4 flex items-center gap-1">
        {onSaveToHistory ? (
          <button
            type="button"
            onClick={onSaveToHistory}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors cursor-pointer"
            aria-label={
              savedToHistory
                ? `Comparativa de ${option.tariffName} ya guardada`
                : `Guardar ${option.tariffName} en historial de comparativas`
            }
            title={savedToHistory ? "Ya está en el historial" : "Guardar en historial"}
          >
            {savedToHistory ? (
              <BookmarkCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDownloadPdf}
          className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors cursor-pointer"
          aria-label={`Descargar estudio PDF de ${option.companyName}`}
          title="Descargar PDF"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-5 pr-10">
        <div className="shrink-0 flex items-center">
          {renderCompaniaLogo(option.companyName, option.companyLogoUrl)}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          {!hasBundledLogo ? (
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 truncate">
              {option.companyName}
            </p>
          ) : null}
          <h3
            className={`text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight flex items-center gap-2 flex-wrap ${
              hasBundledLogo ? "" : "mt-1"
            }`}
          >
            <span>{option.tariffName}</span>
            {option.isBestOption ? (
              <span
                className="inline-flex items-center gap-0.5 text-amber-500"
                title={bestLabel}
              >
                <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden />
                <span className="sr-only">{bestLabel}</span>
              </span>
            ) : null}
          </h3>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            segment === "pyme"
              ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          }`}
        >
          {segment === "pyme" ? "Empresa" : "Residencial"}
        </span>
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-surface text-brand-subtext border border-brand-border">
          {pricingLabelText}
        </span>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
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
        {option.showCommission !== false && option.commissionEur != null && option.commissionEur > 0 ? (
          <div className="pt-1.5 mt-1.5 border-t border-dashed border-brand-border/60">
            <div className="flex items-center justify-between gap-4">
              <span className="text-brand-subtext">Comisión percibida</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatEuro(option.commissionEur)}
              </span>
            </div>
            {option.commissionTramoLabel ? (
              <p className="mt-1 text-[10px] leading-snug text-brand-subtext line-clamp-2">
                {option.commissionPrecision === "estimado" ? "Estimado · " : ""}
                {option.commissionTramoLabel}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 pt-3 border-t border-brand-border">
        <div className="flex items-end justify-between gap-4">
          <span className="text-sm font-semibold text-brand-text">Total</span>
          <span
            className={`text-2xl font-extrabold font-display tabular-nums leading-none ${totalClass}`}
          >
            {formatEuro(option.monthlyCost)}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-mono text-brand-subtext text-right leading-snug">
          IEE e IVA incluidos
          {option.monthlyBaseImponible != null && option.monthlyBaseImponible > 0 ? (
            <>
              <br />
              Base {formatEuro(option.monthlyBaseImponible)}
              {option.monthlyIee != null && option.monthlyIee > 0
                ? ` · IEE ${formatEuro(option.monthlyIee)}`
                : ""}
              {option.monthlyIva != null && option.monthlyIva > 0
                ? ` · IVA ${formatEuro(option.monthlyIva)}`
                : ""}
            </>
          ) : null}
        </p>
        <p className={`mt-2 text-sm font-semibold ${savingsClass}`}>
          {tone === "positive"
            ? `Ahorra ${formatEuro(ahorroMonthly)}/mes (${savingsPct}%)`
            : tone === "negative"
              ? `+${formatEuro(Math.abs(ahorroMonthly))}/mes (${savingsPct}% más caro)`
              : "Sin ahorro respecto a tu factura"}
        </p>
      </div>

      {breakdownRows.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setDesgloseOpen((open) => !open)}
            className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-xl border border-brand-border bg-brand-surface/60 hover:bg-brand-surface text-xs font-bold text-brand-text transition-colors cursor-pointer"
            aria-expanded={desgloseOpen}
          >
            <span>Desglose</span>
            <ChevronDown
              className={`h-4 w-4 text-brand-subtext transition-transform ${desgloseOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence initial={false}>
            {desgloseOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-xl border border-brand-border/70 bg-brand-surface/40 px-3 py-1">
                  {breakdownRows.map((row) => (
                    <BreakdownRow key={row.id} row={row} />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onContract}
        className="mt-4 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors cursor-pointer"
      >
        Contratar
      </button>

      {tone === "positive" && onSendEmail ? (
        <button
          type="button"
          onClick={onSendEmail}
          disabled={sendingEmail}
          className="mt-2 w-full py-2.5 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-elevated text-brand-text text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          <Mail className="h-3.5 w-3.5" />
          {sendingEmail ? "Generando email…" : "Enviar propuesta por email"}
        </button>
      ) : null}
    </article>
  )
}
