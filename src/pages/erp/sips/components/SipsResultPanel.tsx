import { RefreshCw } from "lucide-react"
import { ComparadorFormSection } from "@/components/comparador/ComparadorFormSection"
import { SUPPLY_KIND_THEME, kpiCardClass } from "@/lib/enersave-ui-theme"
import type { SipsOutcome, SipsResumen } from "@/lib/sips/types"

type ListoOutcome = Extract<SipsOutcome, { status: "listo" }>

const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"] as const

const kwFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 })
const kwhFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 })

function formatConsultedAt(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })
}

function InfoCard({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className={`${kpiCardClass({})} p-3`}>
      <p className="text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">{label}</p>
      <p
        className={`mt-1 font-mono font-extrabold break-words ${
          highlight ? `text-xl ${SUPPLY_KIND_THEME.luz.kpiValue}` : "text-sm text-brand-text"
        }`}
      >
        {value ?? "Sin dato"}
      </p>
    </div>
  )
}

function PowerBars({ potenciasKw }: { potenciasKw: SipsResumen["potenciasKw"] }) {
  const values = PERIODS.map((period) => potenciasKw[period] ?? null)
  const max = Math.max(...values.map((value) => value ?? 0), 0)

  if (max === 0) {
    return <p className="text-xs text-brand-subtext">El proveedor no devuelve potencias para este CUPS.</p>
  }

  return (
    <ul className="space-y-2" aria-label="Potencias contratadas por periodo">
      {PERIODS.map((period, index) => {
        const kw = values[index]
        if (kw === null) return null
        return (
          <li key={period} className="grid grid-cols-[2rem_1fr_5.5rem] items-center gap-3">
            <span className="font-mono text-[10px] font-bold text-brand-subtext">{period}</span>
            <span className="h-2 rounded-full bg-brand-surface border border-brand-border overflow-hidden">
              <span
                className={`block h-full rounded-full ${SUPPLY_KIND_THEME.luz.kpiAccent}`}
                style={{ width: `${(kw / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono text-xs font-extrabold tabular-nums text-brand-text">
              {kwFormat.format(kw)} kW
            </span>
          </li>
        )
      })}
    </ul>
  )
}

interface SipsResultPanelProps {
  outcome: ListoOutcome
  onRefresh: () => void
}

export function SipsResultPanel({ outcome, onRefresh }: SipsResultPanelProps) {
  const { resumen } = outcome
  const location = [resumen.municipio, resumen.provincia].filter(Boolean).join(", ")
  const consulted = formatConsultedAt(outcome.consultadoEn)
  const meta = [outcome.origen ? `Origen: ${outcome.origen}` : null, consulted ? `Consultado: ${consulted}` : null]
    .filter(Boolean)
    .join(" · ")

  return (
    <section aria-label="Resultado SIPS" className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-4">
        <p className="font-mono text-xs font-bold text-brand-text break-all">{outcome.cups}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-brand-subtext hover:text-brand-text text-[10px] font-extrabold uppercase tracking-wider cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar datos
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <InfoCard label="Tarifa de acceso" value={resumen.tarifa} highlight />
        <InfoCard
          label="Consumo anual"
          value={resumen.consumoAnualKwh === null ? null : `${kwhFormat.format(resumen.consumoAnualKwh)} kWh`}
        />
        <InfoCard label="Distribuidora" value={resumen.distribuidora} />
        <InfoCard label="CNAE" value={resumen.cnae} />
        <InfoCard label="Código postal" value={resumen.codigoPostal} />
        <InfoCard label="Ubicación" value={location || null} />
      </div>

      <ComparadorFormSection title="Potencia contratada">
        <PowerBars potenciasKw={resumen.potenciasKw} />
      </ComparadorFormSection>

      {meta ? <p className="text-[10px] font-mono text-brand-subtext">{meta}</p> : null}
    </section>
  )
}
