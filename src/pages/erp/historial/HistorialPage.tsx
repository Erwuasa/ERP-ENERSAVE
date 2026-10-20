import { FileClock, Search, Download, Loader2 } from "lucide-react"
import {
  comparisonHistoryCanDownloadPdf,
  comparisonHistoryInvoiceTotal,
  comparisonHistorySavingsMonthly,
  type ComparisonHistoryEntry,
} from "@/lib/comparador-history-storage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export function HistorialPage() {
  const {
    comparisonsHistory,
    compHistorySearch,
    setCompHistorySearch,
    formatCurrency,
    selectedComparisonIds,
    isGeneratingJointPdf,
    toggleComparisonSelection,
    handleDownloadHistoryPdf,
    handleDownloadJointHistoryPdf,
  } = useErpWorkspaceContext()

  const filtered = comparisonsHistory.filter(
    (item) =>
      item.clientName.toLowerCase().includes(compHistorySearch.toLowerCase()) ||
      item.cups.toLowerCase().includes(compHistorySearch.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-6 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <FileClock className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                Historial de Comparativas
              </h3>
              <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
                Selecciona 2 o más para un estudio conjunto
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-brand-subtext absolute top-3 left-3" />
              <input
                type="text"
                placeholder="Buscar CUPS..."
                value={compHistorySearch}
                onChange={(e) => setCompHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-medium"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleDownloadJointHistoryPdf()}
              disabled={isGeneratingJointPdf || selectedComparisonIds.length < 2}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {isGeneratingJointPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Estudio conjunto ({selectedComparisonIds.length})
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-subtext border border-dashed border-brand-border rounded-2xl bg-slate-50/50">
            <p className="text-xs">No hay comparativas locales ni sincronizadas de AT.</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {filtered.map((item, idx) => {
              const row = historyRowView(item)
              const selected = selectedComparisonIds.includes(item.id)
              return (
                <article
                  key={item.id || idx}
                  className="rounded-2xl border border-brand-border p-3 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleComparisonSelection(item.id)}
                      className="mt-0.5 rounded border-brand-border cursor-pointer"
                      aria-label={`Seleccionar ${item.cups || "comparativa"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] font-bold text-brand-text break-all">
                        {item.cups || "—"}
                        {item.source === "at" ? <AtBadge /> : null}
                      </div>
                      <div className="text-[10px] text-brand-subtext font-mono mt-0.5">{item.date}</div>
                    </div>
                  </div>
                  <div>
                    <TariffBadge tariff={item.accessTariff} />
                    <div className="text-[10px] text-brand-subtext mt-1">{item.bestTariffName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
                        Total factura
                      </p>
                      <p className="font-mono font-bold text-brand-text text-sm">
                        {formatCurrency(row.invoiceTotal)}
                        <span className="text-[10px] font-medium text-brand-subtext">/mes</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
                        Ahorro
                      </p>
                      <p className={`font-mono font-extrabold text-sm ${row.savingsClass}`}>
                        {formatCurrency(row.savingsMonthly)}
                        <span className="text-[10px] font-medium">/mes</span>
                      </p>
                      <p className={`text-[10px] font-bold ${row.savingsClass}`}>{row.savingsPercent}%</p>
                    </div>
                  </div>
                  <PdfButton
                    disabled={!row.canDownload}
                    onClick={() => void handleDownloadHistoryPdf(item)}
                    className="w-full justify-center"
                  />
                </article>
              )
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border text-[10px] uppercase font-bold tracking-wider font-mono text-brand-subtext">
                  <th className="pb-3 px-2 w-8" />
                  <th className="pb-3 px-2">CUPS</th>
                  <th className="pb-3 px-2">Tarifa de acceso</th>
                  <th className="pb-3 px-2 text-right">Total factura</th>
                  <th className="pb-3 px-2 text-right">Ahorro</th>
                  <th className="pb-3 px-2 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map((item, idx) => {
                  const row = historyRowView(item)
                  const selected = selectedComparisonIds.includes(item.id)
                  return (
                    <tr
                      key={item.id || idx}
                      className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all"
                    >
                      <td className="py-4 px-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleComparisonSelection(item.id)}
                          className="rounded border-brand-border cursor-pointer"
                          aria-label={`Seleccionar ${item.cups}`}
                        />
                      </td>
                      <td className="py-4 px-2">
                        <div className="font-mono text-[11px] font-bold text-brand-text break-all">
                          {item.cups || "—"}
                          {item.source === "at" ? <AtBadge /> : null}
                        </div>
                        <div className="text-[10px] text-brand-subtext font-mono mt-0.5">
                          {item.date}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <TariffBadge tariff={item.accessTariff} />
                        <div className="text-[10px] text-brand-subtext mt-1">{item.bestTariffName}</div>
                      </td>
                      <td className="py-4 px-2 text-right font-mono font-bold text-brand-text whitespace-nowrap">
                        {formatCurrency(row.invoiceTotal)}
                        <span className="text-[10px] font-medium text-brand-subtext">/mes</span>
                      </td>
                      <td className={`py-4 px-2 text-right font-mono whitespace-nowrap ${row.savingsClass}`}>
                        <div className="font-extrabold">
                          {formatCurrency(row.savingsMonthly)}
                          <span className="text-[10px] font-medium">/mes</span>
                        </div>
                        <div className="text-[10px] font-bold mt-0.5">{row.savingsPercent}%</div>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <PdfButton
                          disabled={!row.canDownload}
                          onClick={() => void handleDownloadHistoryPdf(item)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

function historyRowView(item: ComparisonHistoryEntry) {
  const invoiceTotal = comparisonHistoryInvoiceTotal(item)
  const savingsMonthly = comparisonHistorySavingsMonthly(item)
  const savingsPercent = invoiceTotal > 0 ? Math.round((savingsMonthly / invoiceTotal) * 100) : 0
  const savingsClass =
    savingsMonthly > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : savingsMonthly < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-brand-text"
  return {
    invoiceTotal,
    savingsMonthly,
    savingsPercent,
    savingsClass,
    canDownload: comparisonHistoryCanDownloadPdf(item),
  }
}

function AtBadge() {
  return (
    <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-cyan-500/15 text-cyan-700 dark:text-cyan-400">
      AT
    </span>
  )
}

function TariffBadge({ tariff }: { tariff: string }) {
  return (
    <span className="inline-block bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
      {tariff}
    </span>
  )
}

function PdfButton({
  disabled,
  onClick,
  className = "",
}: {
  disabled: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={
        disabled
          ? "Esta comparativa no tiene los precios de la oferta guardados"
          : "PDF con los datos y precios guardados"
      }
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>PDF</span>
    </button>
  )
}
