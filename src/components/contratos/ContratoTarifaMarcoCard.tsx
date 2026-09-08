import type { ReactNode } from "react"
import {
  ContratoDetalleDataCard,
  ContratoDetalleLabeledBlock,
  ContratoDetalleMetaBadge,
} from "@/components/contratos/contrato-detalle-ui"
import type { ContratoTarifaMarcoView } from "@/components/contratos/contrato-tarifa-marco-view"

type Props = {
  view: ContratoTarifaMarcoView
  renderCompaniaLogo: (brandName: string) => ReactNode
  compact?: boolean
}

export function ContratoTarifaMarcoCard({ view, renderCompaniaLogo, compact = false }: Props) {
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0">{renderCompaniaLogo(view.company)}</div>
          <p className="truncate text-sm font-bold tracking-tight text-brand-text">
            {view.company}{" "}
            <span className="font-semibold text-brand-subtext">{view.supply}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view.peaje ? (
            <ContratoDetalleMetaBadge tone="peaje">{view.peaje}</ContratoDetalleMetaBadge>
          ) : null}
          {view.potenciaRango ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-subtext">
              {view.potenciaRango}
            </span>
          ) : null}
        </div>
      </div>

      <ContratoDetalleLabeledBlock label="Marco">
        {view.marcoNombre || "—"}
      </ContratoDetalleLabeledBlock>

      <ContratoDetalleLabeledBlock label="Tarifa">
        <span className="font-mono text-[12px] font-medium leading-relaxed">
          {view.tarifaNombre || "—"}
          {view.preciosInline ? (
            <>
              {" · "}
              <span className="text-brand-subtext">{view.preciosInline}</span>
            </>
          ) : null}
        </span>
      </ContratoDetalleLabeledBlock>

      <ContratoDetalleLabeledBlock label="Servicios">
        <span className={view.hasSva ? "text-violet-700 dark:text-violet-300" : "font-normal text-brand-subtext"}>
          {view.servicios || "—"}
        </span>
      </ContratoDetalleLabeledBlock>
    </>
  )

  if (compact) {
    return <div className="space-y-3 border-b border-brand-border px-4 py-3">{body}</div>
  }

  return <ContratoDetalleDataCard title="Tarifa y marco">{body}</ContratoDetalleDataCard>
}
