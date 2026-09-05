import { Flame, Lightbulb, RefreshCw } from "lucide-react"
import type { Contract } from "@/types/contract"
import {
  ContratoDetalleField,
  ContratoDetalleFieldGrid,
  ContratoDetalleSection,
} from "@/components/contratos/contrato-detalle-ui"
import {
  extractBancoFromIban,
  formatConsumoAnualKwh,
  formatContratoPeaje,
  formatPotenciaPeriodLabel,
  resolvePotenciaPeriods,
} from "@/components/contratos/contrato-detalle-utils"

interface ContratoDetalleTabSuministroProps {
  contract: Contract
}

export function ContratoDetalleTabSuministro({ contract }: ContratoDetalleTabSuministroProps) {
  const potenciaPeriods = resolvePotenciaPeriods(contract)
  const peaje = formatContratoPeaje(contract)
  const activePeriodCount = peaje.startsWith("2.0") ? 3 : 6

  return (
    <div className="space-y-5 max-w-4xl">
      <ContratoDetalleSection
        title="Suministro"
        action={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-brand-border text-brand-subtext cursor-default"
            disabled
            title="Disponible en un sprint posterior"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Cambio tarifa
          </button>
        }
      >
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField label="Tipo">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase ${
                contract.tipo === "luz"
                  ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25"
              }`}
            >
              {contract.tipo === "luz" ? (
                <Lightbulb className="w-3.5 h-3.5" />
              ) : (
                <Flame className="w-3.5 h-3.5" />
              )}
              {contract.tipo === "luz" ? "Luz" : "Gas"}
            </span>
          </ContratoDetalleField>
          <ContratoDetalleField label="Peaje" value={peaje} mono />
          <ContratoDetalleField label="CUPS" value={contract.cups} mono />
          <ContratoDetalleField label="Compañía" value={contract.compania} />
          <ContratoDetalleField label="Tarifa" value={contract.tarifa} />
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Datos bancarios">
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField label="IBAN" value={contract.iban} mono />
          <ContratoDetalleField label="Banco" value={extractBancoFromIban(contract.iban)} />
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Dirección de suministro">
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField
            label="Vía"
            value={contract.direccionSuministro}
            className="sm:col-span-2 lg:col-span-3"
          />
          <ContratoDetalleField label="Código postal" value={contract.codigoPostal} mono />
          <ContratoDetalleField label="Ciudad" value={contract.poblacion} />
          <ContratoDetalleField label="Provincia" value={contract.provincia} />
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Potencias contratadas">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: activePeriodCount }, (_, index) => {
            const periodo = index + 1
            const match = potenciaPeriods.find((p) => p.periodo === periodo)
            return (
              <div
                key={periodo}
                className="rounded-lg border border-brand-border/70 bg-brand-bg/40 px-3 py-2 text-center"
              >
                <p className="text-[9px] font-mono uppercase text-brand-subtext">P{periodo}</p>
                <p className="text-sm font-mono font-semibold text-brand-text mt-1 tabular-nums">
                  {match ? formatPotenciaPeriodLabel(match.periodo, match.kw) : "—"}
                </p>
              </div>
            )
          })}
        </div>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Consumo">
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField label="Consumo anual" value={formatConsumoAnualKwh(contract)} />
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>
    </div>
  )
}
