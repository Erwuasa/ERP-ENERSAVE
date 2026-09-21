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
}: {
  prices: ProductoTarifaPrecios["energia"] | ProductoTarifaPrecios["potencia"]
  peaje: string
  kind: PeriodPriceKind
  compact?: boolean
  emptyLabel?: string
}) {
  const chips = periodPriceChips(prices, peaje, kind)
  if (chips.length === 0) {
    return <span className="font-mono text-[10px] text-brand-subtext">{emptyLabel}</span>
  }

  if (hasSingleDistinctPeriodPrice(chips)) {
    return (
      <span className="font-mono text-[11px] font-semibold text-brand-text tabular-nums">
        {formatPeriodPriceNumber(chips[0].value)}
      </span>
    )
  }

  return (
    <div
      className={`flex flex-wrap gap-x-2 gap-y-0.5 ${compact ? "justify-end" : ""}`}
    >
      {chips.map((chip) => (
        <span key={chip.slot} className="inline-flex items-baseline gap-1 whitespace-nowrap">
          <span className="font-mono text-[9px] font-bold uppercase text-brand-subtext">
            {chip.label}
          </span>
          <span className="font-mono text-[11px] font-semibold text-brand-text tabular-nums">
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
}: {
  energia: ProductoTarifaPrecios["energia"]
  potencia: ProductoTarifaPrecios["potencia"]
  peaje: string
  tipo: "luz" | "gas"
}) {
  const potenciaLabel = tipo === "gas" ? "Término fijo (€/día)" : "Potencia (€/kW·día)"
  const energiaLabel = tipo === "gas" ? "Término variable (€/kWh)" : "Energía (€/kWh)"

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2.5">
        <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext mb-2">
          {potenciaLabel}
        </p>
        <PeriodPricesBlock prices={potencia} peaje={peaje} kind="potencia" />
      </section>
      <section className="rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2.5">
        <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext mb-2">
          {energiaLabel}
        </p>
        <PeriodPricesBlock prices={energia} peaje={peaje} kind="energia" />
      </section>
    </div>
  )
}
