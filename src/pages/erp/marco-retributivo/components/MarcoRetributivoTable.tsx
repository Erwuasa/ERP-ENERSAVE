import type { MouseEvent, ReactNode, RefObject } from "react"
import { useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import {
  formatMarcoComisionFijaUsuario,
  formatMarcoComisionUsuario,
} from "@/data/marco-retributivo-catalog"
import { formatMarcoCondicionesCelda } from "@/lib/marco-condiciones-display"
import { formatMarcoPermanenciaFromRow } from "@/lib/marco-permanencia"
import { marcoRowToCatalogEntry, type MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { formatCompaniaLabel } from "@/lib/erp/compania-logos"
import { buildMarcoTableRowKey } from "@/pages/erp/marco-retributivo/lib/marco-panel-filters"

const MARCO_TH =
  "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-nowrap"

const MARCO_TD = "px-2.5 py-2 align-top border-b border-brand-border/70"
const MARCO_TD_LOGO = "px-1.5 py-1.5 align-middle border-b border-brand-border/70"

type Props = {
  loading: boolean
  filteredRows: MarcoRetributivoRow[]
  canEdit: boolean
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string, logoUrl: string | null) => ReactNode
  onOpenEntry: (row: MarcoRetributivoRow) => void
  onDeactivate: (id: string, e: MouseEvent) => void
}

/** Alto estimado de una fila (px); se reajusta por fila real vía measureElement. */
const ESTIMATED_ROW_HEIGHT = 58
/** Alto estimado de una tarjeta móvil (px); se reajusta por tarjeta real vía measureElement. */
const ESTIMATED_CARD_HEIGHT = 220
/** Tailwind `md`. Por debajo, tarjetas; desde aquí, la tabla de escritorio. */
const DESKTOP_TABLE_QUERY = "(min-width: 768px)"

const FIELD_LABEL = "text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext"

export function MarcoRetributivoTable({
  loading,
  filteredRows,
  canEdit,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
  onOpenEntry,
  onDeactivate,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardScrollRef = useRef<HTMLDivElement>(null)
  const isDesktopTable = useMediaQuery(DESKTOP_TABLE_QUERY)

  // Las filas pueden llegar a varios miles (una por tramo de consumo x campaña x tarifa).
  // Virtualizamos el <tbody> para montar solo las filas visibles en el viewport: el DOM
  // nunca crece con filteredRows.length, así que el scroll sigue fluido con cualquier volumen.
  const virtualizer = useVirtualizer({
    count: isDesktopTable ? filteredRows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10,
  })

  const cardVirtualizer = useVirtualizer({
    count: isDesktopTable ? 0 : filteredRows.length,
    getScrollElement: () => cardScrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 6,
  })

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/30 text-brand-subtext">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs font-mono">Cargando marco retributivo…</span>
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()
  const topSpacer = virtualItems.length > 0 ? virtualItems[0].start : 0
  const bottomSpacer =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0

  if (!isDesktopTable) {
    return (
      <MarcoRetributivoCardList
        scrollRef={cardScrollRef}
        virtualizer={cardVirtualizer}
        filteredRows={filteredRows}
        canEdit={canEdit}
        commissionPercentage={commissionPercentage}
        formatCurrency={formatCurrency}
        renderCompaniaLogo={renderCompaniaLogo}
        onOpenEntry={onOpenEntry}
        onDeactivate={onDeactivate}
      />
    )
  }

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 overflow-auto overscroll-contain scrollbar-overlay rounded-xl border border-brand-border/60 bg-brand-surface/30"
    >
      <table className="w-full min-w-[820px] table-fixed text-left text-xs">
        <colgroup>
          <col className="w-[5.25rem]" />
          <col className="w-[20%]" />
          <col className="w-[72px]" />
          <col className="w-[26%]" />
          <col className="w-[100px]" />
          <col className="w-[13%]" />
          <col className="w-[80px]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-brand-panel">
          <tr>
            <th className={`${MARCO_TH} text-center`}>Compañía</th>
            <th className={MARCO_TH}>Tarifa</th>
            <th className={MARCO_TH}>Peaje</th>
            <th className={MARCO_TH}>Condiciones</th>
            <th className={MARCO_TH}>Permanencia</th>
            <th className={`${MARCO_TH} text-right text-emerald-600`}>Comisión</th>
            <th className={`${MARCO_TH} text-right`}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-2.5 py-10 text-center text-brand-subtext font-mono text-[11px]"
              >
                No hay tarifas para los filtros seleccionados.
              </td>
            </tr>
          ) : (
            <>
              {topSpacer > 0 && (
                <tr aria-hidden="true" style={{ height: topSpacer }}>
                  <td colSpan={7} className="p-0 border-0" />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const row = filteredRows[virtualRow.index]
                const entry = marcoRowToCatalogEntry(row)
                return (
                  <tr
                    key={buildMarcoTableRowKey(row, virtualRow.index)}
                    ref={(node) => virtualizer.measureElement(node)}
                    data-index={virtualRow.index}
                    onClick={() => onOpenEntry(row)}
                    className="hover:bg-slate-50 dark:hover:bg-brand-elevated/50 transition-colors cursor-pointer"
                  >
                    <td className={MARCO_TD_LOGO}>
                      <div className="flex items-center justify-center min-h-[2.5rem]">
                        {renderCompaniaLogo(row.compania, row.companiaLogoUrl)}
                        <span className="sr-only">{formatCompaniaLabel(row.compania)}</span>
                      </div>
                    </td>
                    <td className={MARCO_TD}>
                      <span className="font-semibold text-brand-text block truncate">{row.tarifa}</span>
                      <span className="flex flex-wrap gap-1 mt-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                            row.tipo === "luz"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {row.tipo}
                        </span>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-slate-500/10 text-brand-subtext">
                          {row.segmento}
                        </span>
                      </span>
                    </td>
                    <td className={`${MARCO_TD} font-mono text-[10px] text-brand-subtext`}>
                      {row.peaje}
                    </td>
                    <td className={`${MARCO_TD} text-[11px] text-brand-subtext leading-snug`}>
                      <span className="line-clamp-2">{formatMarcoCondicionesCelda(row)}</span>
                    </td>
                    <td className={`${MARCO_TD} font-mono text-[10px] text-brand-subtext`}>
                      {formatMarcoPermanenciaFromRow(row)}
                    </td>
                    <td className={`${MARCO_TD} text-right font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-500`}>
                      {entry.comisionTipo === "fija" ? (
                        <span>
                          {formatMarcoComisionFijaUsuario(
                            entry,
                            commissionPercentage,
                            formatCurrency
                          )}
                        </span>
                      ) : (
                        formatMarcoComisionUsuario(entry, commissionPercentage, formatCurrency)
                      )}
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
              })}
              {bottomSpacer > 0 && (
                <tr aria-hidden="true" style={{ height: bottomSpacer }}>
                  <td colSpan={7} className="p-0 border-0" />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

type CardVirtualizer = {
  getVirtualItems: () => ReadonlyArray<{
    index: number
    start: number
    end: number
    key: string | number | bigint
  }>
  getTotalSize: () => number
  measureElement: (node: Element | null) => void
}

function formatRowComision(
  row: MarcoRetributivoRow,
  commissionPercentage: number,
  formatCurrency: (val: number) => string
): string {
  const entry = marcoRowToCatalogEntry(row)
  if (entry.comisionTipo === "fija") {
    return formatMarcoComisionFijaUsuario(entry, commissionPercentage, formatCurrency)
  }
  return formatMarcoComisionUsuario(entry, commissionPercentage, formatCurrency)
}

function MarcoRetributivoCardList({
  scrollRef,
  virtualizer,
  filteredRows,
  canEdit,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
  onOpenEntry,
  onDeactivate,
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  virtualizer: CardVirtualizer
  filteredRows: MarcoRetributivoRow[]
  canEdit: boolean
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string, logoUrl: string | null) => ReactNode
  onOpenEntry: (row: MarcoRetributivoRow) => void
  onDeactivate: (id: string, e: MouseEvent) => void
}) {
  const virtualItems = virtualizer.getVirtualItems()
  const topSpacer = virtualItems.length > 0 ? virtualItems[0].start : 0
  const bottomSpacer =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-overlay rounded-xl border border-brand-border/60 bg-brand-surface/30"
    >
      {filteredRows.length === 0 ? (
        <p className="px-3 py-10 text-center text-brand-subtext font-mono text-[11px]">
          No hay tarifas para los filtros seleccionados.
        </p>
      ) : (
        <>
          {topSpacer > 0 && <div aria-hidden="true" style={{ height: topSpacer }} />}
          {virtualItems.map((virtualRow) => {
            const row = filteredRows[virtualRow.index]
            const companyLabel = formatCompaniaLabel(row.compania)
            return (
              <div
                key={buildMarcoTableRowKey(row, virtualRow.index)}
                ref={(node) => virtualizer.measureElement(node)}
                data-index={virtualRow.index}
                className="px-2 py-1.5"
              >
                <article
                  onClick={() => onOpenEntry(row)}
                  className="cursor-pointer rounded-xl border border-brand-border bg-brand-surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">{renderCompaniaLogo(row.compania, row.companiaLogoUrl)}</div>
                    <p className="min-w-0 text-xs font-extrabold uppercase tracking-wide text-brand-text break-words">
                      {companyLabel || "Sin compañía"}
                    </p>
                  </div>

                  <p className="mt-3 text-sm font-semibold leading-snug text-brand-text break-words">
                    {row.tarifa}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                        row.tipo === "luz"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {row.tipo}
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-slate-500/10 text-brand-subtext">
                      {row.segmento}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <div className="min-w-0">
                      <dt className={FIELD_LABEL}>Peaje</dt>
                      <dd className="mt-0.5 font-mono text-xs text-brand-text break-words">{row.peaje}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className={FIELD_LABEL}>Permanencia</dt>
                      <dd className="mt-0.5 font-mono text-xs text-brand-text break-words">
                        {formatMarcoPermanenciaFromRow(row)}
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className={FIELD_LABEL}>Condiciones</dt>
                      <dd className="mt-0.5 text-[11px] leading-snug text-brand-subtext break-words">
                        {formatMarcoCondicionesCelda(row)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-brand-border/70 pt-3">
                    <div className="min-w-0">
                      <p className={FIELD_LABEL}>Comisión</p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-500 break-words">
                        {formatRowComision(row, commissionPercentage, formatCurrency)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenEntry(row)
                        }}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-brand-border text-brand-subtext hover:text-cyan-600 cursor-pointer"
                        title={canEdit ? "Editar" : "Ver detalle"}
                        aria-label={canEdit ? "Editar" : "Ver detalle"}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => void onDeactivate(row.id, e)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-brand-border text-brand-subtext hover:text-rose-500 cursor-pointer"
                          title="Desactivar"
                          aria-label="Desactivar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            )
          })}
          {bottomSpacer > 0 && <div aria-hidden="true" style={{ height: bottomSpacer }} />}
        </>
      )}
    </div>
  )
}
