import type { MouseEvent, ReactNode } from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import {
  formatMarcoComisionBase,
  formatMarcoComisionUsuario,
} from "@/data/marco-retributivo-catalog"
import { marcoRowToCatalogEntry, type MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

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
      <div className="flex items-center justify-center gap-2 py-16 text-brand-subtext">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs font-mono">Cargando marco retributivo…</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-border">
      <table className="w-full min-w-[880px] text-left text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-brand-surface/80 border-b border-brand-border">
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Compañía
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Tarifa
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Peaje
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold min-w-[200px]">
              Condiciones
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Permanencia
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right">
              Comisión base
            </th>
            {showComisionEnersave && (
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-emerald-600 font-bold text-right">
                Comisión ENerSave
              </th>
            )}
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-amber-600 font-bold text-right">
              Tu comisión
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right w-[88px]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border">
          {filteredRows.length === 0 ? (
            <tr>
              <td
                colSpan={showComisionEnersave ? 9 : 8}
                className="px-4 py-10 text-center text-brand-subtext font-mono text-[11px]"
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
                  className="bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-brand-elevated/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2 min-w-0">
                      {renderCompaniaLogo(row.compania)}
                      <span className="font-semibold text-brand-text leading-tight">
                        {row.compania}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="font-semibold text-brand-text block">{row.tarifa}</span>
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
                  <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                    {row.peaje}
                  </td>
                  <td className="px-4 py-3 align-top text-[11px] text-brand-subtext leading-relaxed max-w-xs">
                    {row.condiciones ??
                      [row.condicion_1, row.condicion_2].filter(Boolean).join(" · ")}
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                    {row.vigencia_meses === 0
                      ? "Sin permanencia"
                      : `${row.vigencia_meses} meses`}
                  </td>
                  <td className="px-4 py-3 align-top text-right font-mono text-[11px] text-brand-text whitespace-nowrap">
                    {formatMarcoComisionBase(entry)}
                  </td>
                  {showComisionEnersave && (
                    <td className="px-4 py-3 align-top text-right font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-500 whitespace-nowrap">
                      {formatMarcoComisionUsuario(entry, 100, formatCurrency)}
                    </td>
                  )}
                  <td className="px-4 py-3 align-top text-right font-mono text-[11px] font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">
                    {formatMarcoComisionUsuario(entry, commissionPercentage, formatCurrency)}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
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
