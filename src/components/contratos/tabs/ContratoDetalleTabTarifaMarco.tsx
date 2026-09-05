import { Flame, Lightbulb, Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import type { Contract } from "@/types/contract"
import {
  ContratoDetalleField,
  ContratoDetalleFieldGrid,
  ContratoDetalleSection,
} from "@/components/contratos/contrato-detalle-ui"
import {
  formatMarcoPotenciaSegmento,
  formatMarcoRetributivoNombre,
  marcoActivePeriodCount,
  marcoHasSva,
  marcoPeriodEnergia,
  marcoPeriodPotencia,
} from "@/components/contratos/contrato-marco-display-utils"
import { useContratoMarcoRow } from "@/components/contratos/hooks/useContratoMarcoRow"
import { formatMarcoSegmentoLabel } from "@/lib/supabase/marco-retributivo"
import { formatPrecioEnergia, formatPrecioPotencia } from "@/lib/productos-catalog"

interface ContratoDetalleTabTarifaMarcoProps {
  contract: Contract
  renderCompaniaLogo: (brandName: string) => ReactNode
}

export function ContratoDetalleTabTarifaMarco({
  contract,
  renderCompaniaLogo,
}: ContratoDetalleTabTarifaMarcoProps) {
  const { row, isLoading } = useContratoMarcoRow(contract)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-brand-subtext text-sm py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando marco retributivo…
      </div>
    )
  }

  if (!row) {
    return (
      <p className="text-sm text-brand-subtext italic py-4">
        No hay marco retributivo vinculado a este contrato.
      </p>
    )
  }

  const periodCount = marcoActivePeriodCount(row.peaje)
  const hasSva = marcoHasSva(row)

  return (
    <div className="space-y-5 max-w-4xl">
      <ContratoDetalleSection title="Compañía y tarifa">
        <div className="flex items-center gap-3 mb-4">
          {renderCompaniaLogo(row.compania)}
          <div>
            <p className="text-base font-bold text-brand-text">{row.compania}</p>
            <p className="text-xs text-brand-subtext font-mono">{row.tarifa}</p>
          </div>
        </div>

        <ContratoDetalleFieldGrid>
          <ContratoDetalleField label="Tipo de suministro">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase ${
                row.tipo === "luz"
                  ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25"
              }`}
            >
              {row.tipo === "luz" ? (
                <Lightbulb className="w-3.5 h-3.5" />
              ) : (
                <Flame className="w-3.5 h-3.5" />
              )}
              {row.tipo === "luz" ? "Luz" : "Gas"}
            </span>
          </ContratoDetalleField>
          <ContratoDetalleField label="Peaje" value={row.peaje} mono />
          <ContratoDetalleField
            label="Segmento"
            value={formatMarcoSegmentoLabel(row.segmento)}
          />
          <ContratoDetalleField
            label="Segmento de potencia"
            value={formatMarcoPotenciaSegmento(row)}
          />
          <ContratoDetalleField
            label="Marco retributivo"
            value={formatMarcoRetributivoNombre(row)}
            className="sm:col-span-2 lg:col-span-3"
          />
          <ContratoDetalleField
            label="Nombre comercial de la tarifa"
            value={row.tarifa}
            className="sm:col-span-2"
          />
          <ContratoDetalleField label="Servicios / SVA">
            <span
              className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                hasSva
                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/25"
                  : "bg-brand-bg text-brand-subtext border border-brand-border/70"
              }`}
            >
              {hasSva ? "Servicios / SVA incluidos" : "Sin servicios añadidos"}
            </span>
          </ContratoDetalleField>
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Precios potencia (P) y energía (E)">
        <div className="overflow-x-auto rounded-xl border border-brand-border/70">
          <table className="w-full min-w-[480px] text-xs">
            <thead>
              <tr className="bg-brand-surface/80 border-b border-brand-border">
                <th className="px-3 py-2 text-left text-[10px] font-mono uppercase text-brand-subtext">
                  Periodo
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-mono uppercase text-brand-subtext">
                  Potencia (P)
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-mono uppercase text-brand-subtext">
                  Energía (E)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {Array.from({ length: periodCount }, (_, index) => {
                const periodo = index + 1
                const potencia = marcoPeriodPotencia(row, periodo)
                const energia = marcoPeriodEnergia(row, periodo)
                return (
                  <tr key={periodo}>
                    <td className="px-3 py-2.5 font-mono font-bold text-brand-text">P{periodo}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-brand-text tabular-nums">
                      {potencia != null ? formatPrecioPotencia(potencia) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-brand-text tabular-nums">
                      {energia != null ? formatPrecioEnergia(energia) : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ContratoDetalleSection>
    </div>
  )
}
