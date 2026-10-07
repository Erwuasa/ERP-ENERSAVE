export interface ComparadorOfferCommissionStripProps {
  amountEur?: number | null
  precision?: "exacto" | "estimado" | "sin_datos" | "sin_consumo"
  /** Destaca cuando la oferta lidera el ranking por comisión. */
  highlighted?: boolean
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function resolveCommissionDisplay(
  amountEur: number | null | undefined,
  precision: ComparadorOfferCommissionStripProps["precision"]
): { text: string; muted: boolean; title?: string } {
  if (precision === "sin_consumo") {
    return { text: "—", muted: true, title: "Indica consumo para calcular la comisión" }
  }
  if (amountEur == null || precision === "sin_datos") {
    return { text: "—", muted: true, title: "Sin marco retributivo vinculado" }
  }
  return { text: formatEuro(amountEur), muted: false }
}

/** Fila de comisión bajo el total de la tarjeta. */
export function ComparadorOfferCommissionStrip({
  amountEur,
  precision,
  highlighted = false,
}: ComparadorOfferCommissionStripProps) {
  const display = resolveCommissionDisplay(amountEur, precision)

  return (
    <div
      className="flex items-center justify-between gap-4 text-sm mt-2"
      role="group"
      aria-label={
        display.muted
          ? "Comisión percibida no disponible"
          : `Comisión percibida ${display.text}`
      }
    >
      <span className="text-brand-subtext">Comisión percibida</span>
      <span
        className={`font-mono tabular-nums shrink-0 ${
          display.muted
            ? "text-brand-subtext/80"
            : `text-emerald-600 dark:text-emerald-400 ${highlighted ? "font-bold" : "font-semibold"}`
        }`}
        title={display.title}
      >
        {display.text}
      </span>
    </div>
  )
}
