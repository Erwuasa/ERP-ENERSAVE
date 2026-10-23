import type { Contract } from "@/types/contract"
import { ContratoDetalleSection } from "@/components/contratos/contrato-detalle-ui"

type Props = {
  contract: Contract
}

function daysOpen(iso?: string): number | null {
  if (!iso) return null
  const elapsed = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(elapsed) || elapsed < 0) return null
  return Math.floor(elapsed / 86_400_000)
}

function formatWhen(iso?: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ContratoDetalleTabIncidencias({ contract }: Props) {
  const isIncident = contract.estado === "INCIDENCIA ADMINISTRATIVA"
  if (!isIncident) {
    return (
      <p className="text-sm text-brand-subtext">Este contrato no tiene una incidencia abierta.</p>
    )
  }

  const motivo = contract.motivoCambioEstado?.trim() || "No se ha detallado el motivo."
  const openAt = contract.estadoEfectivoDesde
  const days = daysOpen(openAt)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Este contrato está parado por una incidencia
            </p>
            <p className="mt-0.5 text-[12px] text-rose-700 dark:text-rose-300">
              Adjunta lo que falte y márcala como resuelta para que siga su curso.
            </p>
          </div>
          {openAt && days != null ? (
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
              Abierta {days === 0 ? "hoy" : `hace ${days} ${days === 1 ? "día" : "días"}`} ·{" "}
              {formatWhen(openAt)}
            </span>
          ) : null}
        </div>
      </div>
      <ContratoDetalleSection title="Motivo">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-brand-text">{motivo}</p>
      </ContratoDetalleSection>
    </div>
  )
}
