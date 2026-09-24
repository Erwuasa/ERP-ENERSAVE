import { Wallet } from "lucide-react"

export interface ComparadorOfferCommissionStripProps {
  amountEur: number
  precision?: "exacto" | "estimado" | "sin_datos" | "sin_consumo"
  tramoLabel?: string
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

export function ComparadorOfferCommissionStrip({
  amountEur,
  precision,
  tramoLabel,
  highlighted = false,
}: ComparadorOfferCommissionStripProps) {
  const precisionNote =
    precision === "estimado" ? "Estimado" : precision === "exacto" ? "Marco retributivo" : null

  return (
    <div
      className={`mt-3 flex items-stretch gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 ${
        highlighted
          ? "border-amber-500/45 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent ring-1 ring-amber-500/20 dark:from-amber-400/15 dark:via-amber-400/10"
          : "border-amber-500/25 bg-amber-500/[0.07] dark:bg-amber-400/[0.08]"
      }`}
      role="group"
      aria-label={`Tu comisión percibida ${formatEuro(amountEur)}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          highlighted ? "bg-amber-500/20 text-amber-800 dark:text-amber-200" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        }`}
        aria-hidden
      >
        <Wallet className="h-5 w-5" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/90 dark:text-amber-200/90">
          Tu comisión percibida
        </p>
        {(precisionNote || tramoLabel) && (
          <p className="text-[10px] leading-snug text-amber-900/70 dark:text-amber-100/70 line-clamp-2">
            {[precisionNote, tramoLabel].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end justify-center pl-1">
        <span className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-none text-amber-700 dark:text-amber-300">
          {formatEuro(amountEur)}
        </span>
        <span className="mt-1 text-[9px] font-mono uppercase text-amber-800/60 dark:text-amber-200/60">
          por contrato
        </span>
      </div>
    </div>
  )
}
