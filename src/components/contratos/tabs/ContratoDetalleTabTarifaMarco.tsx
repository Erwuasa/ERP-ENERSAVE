import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import type { Contract } from "@/types/contract"
import { useContratoMarcoRow } from "@/components/contratos/hooks/useContratoMarcoRow"
import {
  ContratoDetalleDataCard,
  ContratoDetalleLabeledBlock,
  ContratoDetalleMetaBadge,
} from "@/components/contratos/contrato-detalle-ui"
import {
  formatMarcoPotenciaRango,
  formatMarcoPreciosInline,
  formatMarcoRetributivoNombre,
  marcoHasSva,
} from "@/components/contratos/contrato-marco-display-utils"
import { normalizePeaje } from "@/lib/tarifa-cost-calculator"

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
      <div className="flex items-center gap-2 rounded-xl border border-brand-border/80 bg-brand-panel px-4 py-8 text-sm text-brand-subtext shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando marco retributivo…
      </div>
    )
  }

  if (!row) {
    return (
      <ContratoDetalleDataCard title="Tarifa y marco">
        <p className="text-sm italic text-brand-subtext">
          No hay marco retributivo vinculado a este contrato.
        </p>
      </ContratoDetalleDataCard>
    )
  }

  const peaje = normalizePeaje(row.peaje)
  const hasSva = marcoHasSva(row)
  const supplyLabel = row.tipo === "luz" ? "LUZ" : "GAS"
  const preciosInline = formatMarcoPreciosInline(row)
  const potenciaRango = formatMarcoPotenciaRango(row)

  return (
    <ContratoDetalleDataCard title="Tarifa y marco">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0">{renderCompaniaLogo(row.compania)}</div>
          <p className="truncate text-base font-bold tracking-tight text-brand-text">
            {row.compania}{" "}
            <span className="font-semibold text-brand-subtext">{supplyLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ContratoDetalleMetaBadge tone="peaje">{peaje}</ContratoDetalleMetaBadge>
          {potenciaRango !== "—" ? (
            <span className="text-[11px] font-bold uppercase tracking-wide text-brand-subtext">
              {potenciaRango}
            </span>
          ) : null}
        </div>
      </div>

      <ContratoDetalleLabeledBlock label="Marco">
        {formatMarcoRetributivoNombre(row)}
      </ContratoDetalleLabeledBlock>

      <ContratoDetalleLabeledBlock label="Tarifa">
        <span className="font-mono text-[13px] font-medium leading-relaxed">
          {contract.tarifa || row.tarifa}
          {preciosInline ? (
            <>
              {" · "}
              <span className="text-brand-subtext">{preciosInline}</span>
            </>
          ) : null}
        </span>
      </ContratoDetalleLabeledBlock>

      <ContratoDetalleLabeledBlock label="Servicios">
        <span className={hasSva ? "text-violet-700 dark:text-violet-300" : "font-normal text-brand-subtext"}>
          {hasSva ? "Servicios / SVA incluidos" : "Sin servicios añadidos"}
        </span>
      </ContratoDetalleLabeledBlock>
    </ContratoDetalleDataCard>
  )
}
