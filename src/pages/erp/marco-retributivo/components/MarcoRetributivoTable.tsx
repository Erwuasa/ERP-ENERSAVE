import type { MouseEvent, ReactNode } from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import {
  formatMarcoComisionBase,
  formatMarcoComisionUsuario,
} from "@/data/marco-retributivo-catalog"
import { marcoRowToCatalogEntry, type MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

const MARCO_TH =
  "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-nowrap"

const MARCO_TD = "px-2.5 py-2.5 align-top border-b border-brand-border/70"

type Props = {
  loading: boolean
  filteredRows: MarcoRetributivoRow[]
  showComisionEnersave: boolean
  canEdit: boolean
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  onOpenEntry: (row: MarcoRetributivoRow) => void
  onDeactivate: (id: string, e: MouseEvent) => void
}

export function MarcoRetributivoTable({
  loading,
  filteredRows,
  showComisionEnersave,
  canEdit,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
  onOpenEntry,
  onDeactivate,
}: Props) {
  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/30 text-brand-subtext">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs font-mono">Cargando marco retributivo…</span>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-auto overscroll-contain rounded-xl border border-brand-border/60 bg-brand-surface/30">
      <table className="w-full min-w-[960px] table-fixed text-left text-xs">
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[88px]" />
          <col className="w-[22%]" />
          <col className="w-[110px]" />
          <col className="w-[12%]" />
          {showComisionEnersave && <col className="w-[12%]" />}
          <col className="w-[12%]" />
          <col className="w-[88px]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-brand-panel">
          <tr>
            <th className={MARCO_TH}>Compañía</th>
            <th className={MARCO_TH}>Tarifa</th>
            <th className={MARCO_TH}>Peaje</th>
            <th className={MARCO_TH}>Condiciones</th>
            <th className={MARCO_TH}>Permanencia</th>
            <th className={`${MARCO_TH} text-right`}>Comisión base</th>
            {showComisionEnersave && (
              <th className={`${MARCO_TH} text-right text-emerald-600`}>Comisión ENerSave</th>
            )}
            <th className={`${MARCO_TH} text-right text-amber-600`}>Tu comisión</th>
            <th className={`${MARCO_TH} text-right`}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td
                colSpan={showComisionEnersave ? 9 : 8}
                className="px-2.5 py-10 text-center text-brand-subtext font-mono text-[11px]"
              >
                No hay tarifas para los filtros seleccionados.
              </td>
            </tr>
          ) : (
            filteredRows.map((row) => {
              const entry = marcoRowToCatalogEntry(row)
              return (
                <tr
                  key={row.id}
                  onClick={() => onOpenEntry(row)}
                  className="hover:bg-slate-50 dark:hover:bg-brand-elevated/50 transition-colors cursor-pointer"
                >
                  <td className={MARCO_TD}>
                    <div className="flex items-center gap-2 min-w-0">
                      {renderCompaniaLogo(row.compania)}
                      <span className="font-semibold text-brand-text leading-tight truncate">
                        {row.compania}
                      </span>
                    </div>
                  </td>
                  <td className={MARCO_TD}>
                    <span className="font-semibold text-brand-text block truncate">{row.tarifa}</span>
                    <span
                      className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                        row.tipo === "luz"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {row.tipo}
                    </span>
                  </td>
                  <td className={`${MARCO_TD} font-mono text-[10px] text-brand-subtext`}>
                    {row.peaje}
                  </td>
                  <td className={`${MARCO_TD} text-[11px] text-brand-subtext leading-snug`}>
                    <span className="line-clamp-2">
                      {row.condiciones ??
                        [row.condicion_1, row.condicion_2].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className={`${MARCO_TD} font-mono text-[10px] text-brand-subtext`}>
                    {row.vigencia_meses === 0
                      ? "Sin permanencia"
                      : `${row.vigencia_meses} meses`}
                  </td>
                  <td className={`${MARCO_TD} text-right font-mono text-[11px] text-brand-text`}>
                    {formatMarcoComisionBase(entry)}
                  </td>
                  {showComisionEnersave && (
                    <td className={`${MARCO_TD} text-right font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-500`}>
                      {formatMarcoComisionUsuario(entry, 100, formatCurrency)}
                    </td>
                  )}
                  <td className={`${MARCO_TD} text-right font-mono text-[11px] font-bold text-amber-600 dark:text-amber-500`}>
                    {formatMarcoComisionUsuario(entry, commissionPercentage, formatCurrency)}
                  </td>
                  <td className={`${MARCO_TD} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenEntry(row)
                        }}
                        className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-cyan-600 cursor-pointer"
                        title={canEdit ? "Editar" : "Ver detalle"}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => void onDeactivate(row.id, e)}
                          className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-rose-500 cursor-pointer"
                          title="Desactivar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
