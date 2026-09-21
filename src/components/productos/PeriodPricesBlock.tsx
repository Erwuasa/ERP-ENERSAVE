import type { ProductoTarifaPrecios } from "@/lib/productos-catalog"
import {
  formatPeriodPriceNumber,
  hasSingleDistinctPeriodPrice,
  periodPriceChips,
  type PeriodPriceKind,
} from "@/lib/producto-period-prices"

export function PeriodPricesBlock({
  prices,
  peaje,
  kind,
  compact = false,
  emptyLabel = "—",
  size = "sm",
}: {
  prices: ProductoTarifaPrecios["energia"] | ProductoTarifaPrecios["potencia"]
  peaje: string
  kind: PeriodPriceKind
  compact?: boolean
  emptyLabel?: string
  size?: "sm" | "lg"
}) {
  const chips = periodPriceChips(prices, peaje, kind)
  const isLarge = size === "lg"

  if (chips.length === 0) {
    return (
      <span className={`font-mono text-brand-subtext ${isLarge ? "text-sm" : "text-[10px]"}`}>
        {emptyLabel}
      </span>
    )
  }

  if (hasSingleDistinctPeriodPrice(chips)) {
    return (
      <span
        className={`font-mono font-semibold text-brand-text tabular-nums ${
          isLarge ? "text-xl sm:text-2xl tracking-tight" : "text-[11px]"
        }`}
      >
        {formatPeriodPriceNumber(chips[0].value)}
      </span>
    )
  }

  return (
    <div
      className={`flex flex-wrap ${
        isLarge ? "gap-x-4 gap-y-2" : "gap-x-2 gap-y-0.5"
      } ${compact ? "justify-end" : ""}`}
    >
      {chips.map((chip) => (
        <span
          key={chip.slot}
          className={`inline-flex items-baseline whitespace-nowrap ${
            isLarge ? "gap-1.5 rounded-lg bg-brand-bg/60 px-2.5 py-1.5 border border-brand-border/60" : "gap-1"
          }`}
        >
          <span
            className={`font-mono font-bold uppercase text-brand-subtext ${
              isLarge ? "text-[10px] tracking-wider" : "text-[9px]"
            }`}
          >
            {chip.label}
          </span>
          <span
            className={`font-mono font-semibold text-brand-text tabular-nums ${
              isLarge ? "text-base sm:text-lg" : "text-[11px]"
            }`}
          >
            {formatPeriodPriceNumber(chip.value)}
          </span>
        </span>
      ))}
    </div>
  )
}

export function TariffPeriodPricesGrid({
  energia,
  potencia,
  peaje,
  tipo,
  layout = "compact",
}: {
  energia: ProductoTarifaPrecios["energia"]
  potencia: ProductoTarifaPrecios["potencia"]
  peaje: string
  tipo: "luz" | "gas"
  layout?: "compact" | "modal"
}) {
  const potenciaLabel = tipo === "gas" ? "Término fijo (€/día)" : "Potencia (€/kW·día)"
  const energiaLabel = tipo === "gas" ? "Término variable (€/kWh)" : "Energía (€/kWh)"
  const isModal = layout === "modal"
  const priceSize = isModal ? "lg" : "sm"

  return (
    <div className={isModal ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-3"}>
      <section
        className={`rounded-xl border border-brand-border bg-brand-surface/50 ${
          isModal ? "px-4 py-4 sm:px-5 sm:py-5" : "px-3 py-2.5"
        }`}
      >
        <p
          className={`font-mono font-bold uppercase tracking-wider text-brand-subtext mb-3 ${
            isModal ? "text-[10px] sm:text-xs" : "text-[9px] mb-2"
          }`}
        >
          {potenciaLabel}
        </p>
        <PeriodPricesBlock prices={potencia} peaje={peaje} kind="potencia" size={priceSize} />
      </section>
      <section
        className={`rounded-xl border border-brand-border bg-brand-surface/50 ${
          isModal ? "px-4 py-4 sm:px-5 sm:py-5" : "px-3 py-2.5"
        }`}
      >
        <p
          className={`font-mono font-bold uppercase tracking-wider text-brand-subtext mb-3 ${
            isModal ? "text-[10px] sm:text-xs" : "text-[9px] mb-2"
          }`}
        >
          {energiaLabel}
        </p>
        <PeriodPricesBlock prices={energia} peaje={peaje} kind="energia" size={priceSize} />
      </section>
    </div>
  )
}
