import { ChevronDown, FileText, MessageCircleWarning } from "lucide-react"
import type { Alegacion } from "../../types/alegacion"
import type { LiquidacionInternaRow } from "../../lib/liquidaciones-internas"
import {
  buildAutofacturaGestionItems,
  formatAutofacturaPeriodoLabel,
  type AutofacturaGestionItem,
} from "../../lib/liquidaciones-tramitacion"
import type { AutofacturaRecord } from "../../types/autofactura-record"
import type { Settlement } from "../../types/settlement"

function alegacionEstadoBadge(estado: Alegacion["estado"]): { label: string; className: string } {
  if (estado === "abierta") {
    return {
      label: "Abierta",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    }
  }
  if (estado === "en_revision") {
    return {
      label: "En revisión",
      className: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    }
  }
  return {
    label: "Resuelta",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  }
}

function autofacturaEstadoBadge(estado: AutofacturaGestionItem["estado"]): {
  label: string
  className: string
} {
  if (estado === "pendiente") {
    return {
      label: "Pendiente",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    }
  }
  return {
    label: "Procesada",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  }
}

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface LiquidacionesTramitacionPanelProps {
  alegacionRows: LiquidacionInternaRow[]
  autofacturaRecords: AutofacturaRecord[]
  settlements: Settlement[]
  alegacionBySettlementId: Map<string, Alegacion>
  formatCurrency: (value: number) => string
  onOpenAlegacion: (row: LiquidacionInternaRow) => void
  adminScopeTargetRequired?: boolean
}

export function LiquidacionesTramitacionPanel({
  alegacionRows,
  autofacturaRecords,
  settlements,
  alegacionBySettlementId,
  formatCurrency,
  onOpenAlegacion,
  adminScopeTargetRequired = false,
}: LiquidacionesTramitacionPanelProps) {
  const autofacturaItems = buildAutofacturaGestionItems(autofacturaRecords, settlements)

  if (adminScopeTargetRequired) {
    return (
      <p className="text-center text-xs font-mono text-brand-subtext py-10 border border-dashed border-brand-border rounded-xl">
        Selecciona un comercial o equipo para revisar alegaciones y autofacturas.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand-border bg-brand-panel overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-brand-border bg-amber-500/5">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircleWarning className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase font-mono tracking-wide text-brand-text">
                Alegaciones pendientes de gestión
              </h3>
              <p className="text-[10px] text-brand-subtext mt-0.5">
                Abiertas y en revisión, ordenadas por prioridad
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
            {alegacionRows.length}
          </span>
        </header>

        {alegacionRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-brand-subtext">
            No hay alegaciones abiertas o en revisión en el alcance seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border text-[9px] font-mono uppercase text-brand-subtext">
                  <th className="px-4 py-2 font-bold">Estado</th>
                  <th className="px-4 py-2 font-bold">Comercial</th>
                  <th className="px-4 py-2 font-bold">Cliente / CUPS</th>
                  <th className="px-4 py-2 font-bold">Compañía</th>
                  <th className="px-4 py-2 font-bold text-right">Comisión</th>
                  <th className="px-4 py-2 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {alegacionRows.map((row) => {
                  const alegacion = alegacionBySettlementId.get(row.settlement.id)
                  const badge = alegacion ? alegacionEstadoBadge(alegacion.estado) : null
                  return (
                    <tr
                      key={row.settlement.id}
                      className="border-b border-brand-border/70 hover:bg-brand-surface/60 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        {badge ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-brand-text">{row.comercialName}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-brand-text truncate max-w-[220px]">
                          {row.clientName}
                        </p>
                        <p className="text-[10px] font-mono text-brand-subtext truncate max-w-[220px]">
                          {row.cups}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-brand-subtext">{row.compania}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-brand-text">
                        {formatCurrency(row.comision)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenAlegacion(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/15 cursor-pointer"
                        >
                          <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-brand-border bg-brand-panel overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-brand-border bg-emerald-500/5">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase font-mono tracking-wide text-brand-text">
                Autofacturas del periodo
              </h3>
              <p className="text-[10px] text-brand-subtext mt-0.5">
                Emitidas por comerciales; estado según cobro de liquidaciones origen
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {autofacturaItems.length}
          </span>
        </header>

        {autofacturaItems.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-brand-subtext">
            No hay autofacturas registradas en el periodo y alcance seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border text-[9px] font-mono uppercase text-brand-subtext">
                  <th className="px-4 py-2 font-bold">Estado</th>
                  <th className="px-4 py-2 font-bold">Comercial</th>
                  <th className="px-4 py-2 font-bold">Periodo</th>
                  <th className="px-4 py-2 font-bold">Generada</th>
                  <th className="px-4 py-2 font-bold text-right">Liquidaciones</th>
                  <th className="px-4 py-2 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {autofacturaItems.map(({ record, estado }) => {
                  const badge = autofacturaEstadoBadge(estado)
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-brand-border/70 hover:bg-brand-surface/60 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-brand-text">
                        {record.comercialName}
                      </td>
                      <td className="px-4 py-2.5 text-brand-subtext capitalize">
                        {formatAutofacturaPeriodoLabel(record.periodoMes, record.periodoAnio)}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-brand-subtext">
                        {formatGeneratedAt(record.generatedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-brand-subtext">
                        {record.settlementIds.length}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-brand-text">
                        {formatCurrency(record.totalComisionado)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
