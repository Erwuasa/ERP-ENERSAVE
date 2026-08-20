import { AlertTriangle, CheckCircle, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import type { CashflowScenario } from "@/lib/erp/cashflow-demo-data"
import { CashflowTimeline } from "@/pages/erp/cashflow/components/CashflowTimeline"
import { CashflowChartPanel } from "@/pages/erp/cashflow/components/CashflowChartPanel"
import type { CashflowKpiValues } from "@/lib/erp/cashflow-demo-data"

type Props = {
  open: boolean
  onToggle: () => void
  cashflowScenario: CashflowScenario
  setCashflowScenario: (val: CashflowScenario) => void
  kpi: CashflowKpiValues
  formatCurrency: (val: number) => string
}

export function CashflowProjectionSection({
  open,
  onToggle,
  cashflowScenario,
  setCashflowScenario,
  kpi,
  formatCurrency,
}: Props) {
  return (
    <section className="bg-white dark:bg-brand-panel rounded-2xl border border-brand-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-brand-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-cyan-600 dark:text-cyan-400 shrink-0 text-sm">📈</span>
          <span className="text-xs font-bold uppercase tracking-wider font-mono truncate">
            Proyección de caja · cobros vs pagos por mes (real + pendiente)
          </span>
        </div>
        <span className="text-brand-subtext shrink-0 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6 border-t border-brand-border pt-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-slate-50 dark:bg-brand-surface/60 border border-brand-border rounded-2xl">
            <div className="space-y-1">
              <span className="block text-[10px] font-mono tracking-wider uppercase text-brand-subtext font-bold">
                Modulador de Proyección Temporal
              </span>
              <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-brand-surface rounded-xl border border-brand-border">
                {(["optimista", "realista", "pesimista"] as const).map((scen) => (
                  <button
                    key={scen}
                    type="button"
                    onClick={() => {
                      setCashflowScenario(scen)
                      toast.info(`Cargando escenario financiero: ${scen.toUpperCase()}`)
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase font-mono transition-all cursor-pointer ${
                      cashflowScenario === scen
                        ? scen === "optimista"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : scen === "realista"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-red-600 text-white shadow-sm"
                        : "text-brand-subtext hover:text-brand-text"
                    }`}
                  >
                    {scen === "optimista" ? "📈 Optimista" : scen === "realista" ? "⚖️ Realista" : "📉 Pesimista"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <div className="p-3 bg-white dark:bg-brand-panel rounded-xl border border-brand-border px-4 py-2 flex flex-col justify-center min-w-[140px]">
                <span className="text-[9px] text-brand-subtext uppercase tracking-widest block font-semibold">
                  Tasa Descuento
                </span>
                <strong className="text-brand-text text-sm mt-0.5">3.5% (WACC anual)</strong>
              </div>
              <div className="p-3 bg-white dark:bg-brand-panel rounded-xl border border-brand-border px-4 py-2 flex flex-col justify-center min-w-[140px]">
                <span className="text-[9px] text-brand-subtext uppercase tracking-widest block font-semibold">
                  Cierre Período
                </span>
                <strong className="text-brand-text text-sm mt-0.5">30-abr-2026</strong>
              </div>
              <div className="p-3 bg-white dark:bg-brand-panel rounded-xl border border-brand-border px-4 py-2 justify-center flex flex-col min-w-[140px]">
                <span className="text-[9px] text-brand-subtext uppercase tracking-widest block font-semibold">
                  Auditoría
                </span>
                <strong className="text-emerald-500 text-sm mt-0.5 flex items-center gap-1">
                  Conforme <CheckCircle className="w-3.5 h-3.5" />
                </strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <CashflowTimeline formatCurrency={formatCurrency} />
            <CashflowChartPanel
              cashflowScenario={cashflowScenario}
              kpi={kpi}
              formatCurrency={formatCurrency}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white dark:bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                  Simulador Activo: Ajuste de Variables del Circulante
                </h3>
              </div>
              <p className="text-[10px] text-brand-subtext leading-relaxed">
                Modifica los ratios generales de retención y plazos medios de cobro corporativos de las
                comercializadoras para visualizar la resiliencia en tiempo real.
              </p>
              <div className="space-y-4 pt-1 font-mono">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Porcentaje Retención Operativa:</span>
                    <span className="text-emerald-500">30% (Fijo)</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    defaultValue="30"
                    onChange={() =>
                      toast.success(
                        "Sensibilidad de retención simulada. Proyección de capital recomputada"
                      )
                    }
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Días Medios de Pago (Compañías):</span>
                    <span className="text-blue-500">18 días</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="45"
                    defaultValue="18"
                    onChange={() =>
                      toast.success(
                        "Retraso simulado de contratos activados. El piso de tesorería disminuye en -2.400 €"
                      )
                    }
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white dark:bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center space-x-2 pb-1 border-b border-brand-border/60">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                  Alertas de Liquidez y Tesorería
                </h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 bg-red-600 text-white font-mono text-[8px] font-bold rounded shrink-0">
                    ALTA
                  </span>
                  <div className="text-[10px] space-y-1 leading-relaxed">
                    <strong className="font-bold block">Pago Liquidación Impuestos Q1 (Abril 22)</strong>
                    Reclamación de IVA devengado. Salida estimada:{" "}
                    <span className="font-mono text-red-500 font-bold">-5.300,00 €</span>.
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 bg-amber-600 text-white font-mono text-[8px] font-bold rounded shrink-0">
                    MEDIA
                  </span>
                  <div className="text-[10px] space-y-1 leading-relaxed">
                    <strong className="font-bold block">Retraso Auditado en Validación Axpo</strong>
                    Impacto en caja demorado:{" "}
                    <span className="font-mono text-amber-600 font-bold">1.840,00 €</span>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
